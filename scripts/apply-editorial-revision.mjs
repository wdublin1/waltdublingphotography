import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';

const ids = ['walt-photography-site', 'drafts.walt-photography-site'];
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const clone = value => value === undefined ? undefined : structuredClone(value);
const identityFields = ['id','route','priceKey','type','href','name'];
const identity = value => {
  if (!record(value)) return null;
  for (const field of identityFields) if (typeof value[field] === 'string' && value[field]) return `${field}:${value[field]}`;
  return null;
};
function matchingRecords(values, item) {
  // A cleared optional price selector must not hide an otherwise stable session.
  for (const field of identityFields) {
    if (typeof item[field] !== 'string' || !item[field]) continue;
    const matches = values.map((value,index) => ({value,index})).filter(({value}) => record(value) && value[field] === item[field]);
    if (matches.length) return matches;
  }
  return [];
}
const stableKey = value => createHash('sha256').update(value).digest('hex').slice(0,16);
function cmsValue(value, path) {
  if (Array.isArray(value)) return value.map((item,index) => record(item)
    ? {...cmsValue(item,[...path,'item']),_type:path.join('.') === 'featuredSessions' ? 'featuredPhotographyGallery' : `${path.join('_')}_item`,_key:item._key || stableKey(`${path.join('.')}:${identity(item) || index}`)}
    : clone(item));
  if (record(value)) return Object.fromEntries(Object.entries(value).filter(([key]) => !key.startsWith('_')).map(([key,item]) => [key,cmsValue(item,[...path,key])]));
  return clone(value);
}

/** Apply only approved differences between source versions; retain unrelated owner content and array order. */
export function mergeEditorialChanges(previous, desired, current, path = []) {
  if (isDeepStrictEqual(previous,desired)) return clone(current);
  if (previous === undefined) return current === undefined ? cmsValue(desired,path) : clone(current);
  if (record(previous) && record(desired)) {
    if (!record(current)) return cmsValue(desired,path);
    const result = clone(current);
    for (const [key,value] of Object.entries(desired)) {
      if (key.startsWith('_')) continue;
      const next = mergeEditorialChanges(previous[key],value,current[key],[...path,key]);
      if (next !== undefined) result[key]=next;
    }
    return result;
  }
  if (Array.isArray(previous) && Array.isArray(desired) && desired.every(record) && previous.every(record)) {
    if (!Array.isArray(current)) return cmsValue(desired,path);
    const result=clone(current);
    for (const item of desired) {
      const key=identity(item);
      const oldMatches=matchingRecords(previous,item);
      const currentMatches=matchingRecords(result,item);
      if (!key || oldMatches.length>1 || currentMatches.length>1) throw Error('An array identity is ambiguous; no content was written.');
      if (!oldMatches.length) {
        if (!currentMatches.length) result.push(cmsValue([item],path)[0]);
      } else if (currentMatches.length) {
        const {value,index}=currentMatches[0];
        result[index]=mergeEditorialChanges(oldMatches[0].value,item,value,[...path,'item']);
      }
    }
    return result;
  }
  return cmsValue(desired,path);
}

export function revisionSet(document, previous, desired) {
  const result={};
  for(const key of ['copy','navigation','featuredSessions']) {
    const value=mergeEditorialChanges(previous[key],desired[key],document[key],[key]);
    if(value!==undefined && !isDeepStrictEqual(value,document[key])) result[key]=value;
  }
  return result;
}

async function main() {
  const args=process.argv.slice(2);
  const readArg = name => {const i=args.indexOf(name);return i<0?undefined:args[i+1];};
  const baselinePath=readArg('--baseline');const oldPath=readArg('--before-defaults');
  if(!baselinePath || !oldPath)throw Error('Pass --baseline <fresh-cms-snapshot.json> and --before-defaults <previous-defaults.json>. Default mode validates and prints a plan; --apply writes the reviewed differences.');
  const baseline=JSON.parse(readFileSync(baselinePath,'utf8'));
  const previous=JSON.parse(readFileSync(oldPath,'utf8'));
  const desired=JSON.parse(readFileSync(new URL('../content/default-content.json',import.meta.url),'utf8'));
  if(desired._id!==ids[0] || previous._id!==ids[0] || !Array.isArray(baseline) || baseline.some(doc=>!ids.includes(doc._id)))throw Error('Unexpected content identity.');
  const projectId=process.env.SANITY_API_PROJECT_ID,dataset=process.env.SANITY_API_DATASET;
  if(projectId!=='fy5ez6rn' || dataset!=='production' || projectId!==process.env.SANITY_STUDIO_PROJECT_ID || dataset!==process.env.SANITY_STUDIO_DATASET)throw Error('The expected website content destination does not match.');
  const token=process.env.SANITY_API_WRITE_TOKEN;
  if(!token)throw Error('A scoped Sanity write token is required.');
  const headers={Authorization:`Bearer ${token}`,'Content-Type':'application/json'};
  const query=new URL(`https://${projectId}.api.sanity.io/v2026-10-01/data/query/${dataset}`);
  query.searchParams.set('query','*[_id in ["walt-photography-site","drafts.walt-photography-site"]]');query.searchParams.set('perspective','raw');
  const response=await fetch(query,{headers});if(!response.ok)throw Error(`Content read returned ${response.status}.`);
  const documents=(await response.json()).result;
  if(documents.length!==baseline.length || documents.some(doc=>!baseline.some(item=>item._id===doc._id && item._rev===doc._rev)))throw Error('Content changed since the baseline was read. Take a fresh snapshot and review before applying.');
  const mutations=documents.flatMap(doc=>{
    const set=revisionSet(doc,previous,desired);
    return Object.keys(set).length ? [{patch:{id:doc._id,ifRevisionID:doc._rev,set}}] : [];
  });
  console.log(JSON.stringify({mode:args.includes('--apply')?'apply':'plan',projectId,dataset,documents:mutations.map(m=>({id:m.patch.id,revision:m.patch.ifRevisionID,fields:Object.keys(m.patch.set)})),preservesPhotos:true,preservesPrices:true,preservesUnrelatedDraftContent:true}));
  if(!args.includes('--apply') || !mutations.length)return;
  const endpoint=`https://${projectId}.api.sanity.io/v2026-10-01/data/mutate/${dataset}`;
  const dry=await fetch(`${endpoint}?dryRun=true`,{method:'POST',headers,body:JSON.stringify({mutations})});
  if(!dry.ok)throw Error(`Validation returned ${dry.status}; nothing was written.`);
  const write=await fetch(`${endpoint}?visibility=sync&returnDocuments=true`,{method:'POST',headers,body:JSON.stringify({mutations})});
  if(!write.ok)throw Error(`Content update returned ${write.status}; inspect fresh state before retrying.`);
  const result=await write.json();
  const verify=await fetch(query,{headers});if(!verify.ok)throw Error('Content write completed but final read was unavailable.');
  const after=(await verify.json()).result;
  for(const doc of documents) {
    const found=after.find(item=>item._id===doc._id);
    const expected=revisionSet(doc,previous,desired);
    if(!found || Object.entries(expected).some(([key,value])=>!isDeepStrictEqual(found[key],value)) || !isDeepStrictEqual(doc.photos,found.photos) || !isDeepStrictEqual(doc.prices,found.prices) || !isDeepStrictEqual(doc.copy.testimonials,found.copy.testimonials))throw Error('Update completed; final verification requires review.');
  }
  const output=readArg('--result');
  if(output)writeFileSync(output,JSON.stringify({transactionId:result.transactionId,documents:after.map(doc=>({id:doc._id,revision:doc._rev})),verified:true,photosPreserved:true,pricesPreserved:true,testimonialsPreserved:true},null,2)+'\n');
  console.log(JSON.stringify({status:'updated-and-verified',documents:after.map(doc=>({id:doc._id,revision:doc._rev})),photosPreserved:true,pricesPreserved:true,testimonialsPreserved:true}));
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(error=>{console.error(error instanceof Error ? error.message : 'Update stopped.');process.exitCode=1;});
