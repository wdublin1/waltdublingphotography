import {spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';

if (existsSync('.env.local') && !process.env.VERCEL) process.loadEnvFile('.env.local');
const projectId = process.env.SANITY_STUDIO_PROJECT_ID || process.env.SANITY_API_PROJECT_ID || process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.SANITY_STUDIO_DATASET || process.env.SANITY_API_DATASET || process.env.NEXT_PUBLIC_SANITY_DATASET;
if (!projectId || !dataset) throw new Error('Missing provisioned Sanity project configuration.');
mkdirSync('public/studio',{recursive:true});
const result = spawnSync(process.execPath,[path.resolve('node_modules/sanity/bin/sanity'),'build','../public/studio','--yes'],{
  cwd:path.resolve('studio'), stdio:'inherit',
  env:{...process.env, SANITY_STUDIO_PROJECT_ID:projectId, SANITY_STUDIO_DATASET:dataset}
});
if (result.status !== 0) process.exit(result.status || 1);
// Sanity's generated icon links need the same subdirectory as its app bundle.
const studioIndex = path.resolve('public/studio/index.html');
writeFileSync(studioIndex, readFileSync(studioIndex, 'utf8').replaceAll('href="/static/', 'href="/studio/static/'));
console.log('Website assets and authenticated content editor are ready.');
