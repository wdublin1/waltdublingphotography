import {createHmac, randomBytes, timingSafeEqual, createHash} from 'node:crypto';

const COOKIE = 'wdp_inquiry';
const MAX_AGE = 2 * 60 * 60 * 1000;
const MAX_BYTES = 14000;
const limits = {name:120, email:254, session:100, when:200, message:6000, website:200};
const sessions = new Set(['', 'Individual portraits', 'Family portraits', 'Senior or graduate portraits', 'Individual athlete portraits', 'Team photography', 'Wedding photography', 'Something else']);
const json = (body, status=200, extra={}) => Response.json(body, {status, headers:{'Cache-Control':'no-store', 'X-Robots-Tag':'noindex', ...extra}});
const failure = (status, code, message) => json({ok:false,code,message},status);
const DEFAULT_PUBLIC_EMAIL = 'walt@waltdublinphotography.com';

export const inquiryMessageDefaults = Object.freeze({
  incompleteForm: 'Please complete the inquiry form.',
  invalidFieldType: 'Please check the information in your inquiry.',
  invalidFieldContent: 'Please shorten your inquiry and remove any unusual characters.',
  requiredName: 'Please enter your name.',
  invalidEmail: 'Please enter a valid email address so I can reply.',
  invalidSession: 'Please choose a session type from the list.',
  formUnavailable: 'Please email me at {email} while I get the inquiry form ready.',
  invalidOrigin: 'Please send your inquiry from the website contact page.',
  unsupportedFormat: 'Please send your inquiry using the contact form.',
  tooLong: 'Please shorten your inquiry before sending it.',
  malformedRequest: 'Please check your inquiry and try again.',
  refreshRequired: 'Please refresh the contact page and try again.',
  tokenExpired: 'Please try sending your inquiry again.',
  tooSoon: 'Please wait a moment, then send your inquiry.',
  emailUnavailable: 'I couldn’t send your inquiry just now. Please email me at {email}.',
  sendUnconfirmed: 'I couldn’t confirm your inquiry was sent. Please try again, or email me at {email}.'
});

function resolveMessages(messages, email = DEFAULT_PUBLIC_EMAIL) {
  const source = messages && typeof messages === 'object' && !Array.isArray(messages) ? messages : {};
  const candidateEmail = typeof email === 'string' ? email.trim() : '';
  const publicEmail = candidateEmail.length <= 254 && /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(candidateEmail)
    && !/[\u0000-\u001f\u007f]/.test(candidateEmail) ? candidateEmail : DEFAULT_PUBLIC_EMAIL;
  return Object.fromEntries(Object.entries(inquiryMessageDefaults).map(([key, fallback]) => {
    const value = Object.hasOwn(source, key) && typeof source[key] === 'string' ? source[key].trim() : '';
    const template = value && !/[<>\u0000-\u001f\u007f]/.test(value) ? value : fallback;
    return [key, template.replaceAll('{email}', () => publicEmail)];
  }));
}

function sign(value, secret) { return createHmac('sha256',secret).update(value).digest('hex'); }
function cookieValue(request) {
  return (request.headers.get('cookie') || '').split(';').map(s=>s.trim()).find(s=>s.startsWith(`${COOKIE}=`))?.slice(COOKIE.length+1) || '';
}
function cookie(request, nonce, maxAge=7200) {
  return `${COOKIE}=${nonce}; Path=/api/inquiry; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`;
}
function equalSignature(a,b) {
  return /^[a-f0-9]{64}$/.test(a) && timingSafeEqual(Buffer.from(a,'hex'),Buffer.from(b,'hex'));
}

export function validateInquiry(data, messages = {}) {
  return validateInquiryFields(data, resolveMessages(messages));
}

function validateInquiryFields(data, messages) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {error:messages.incompleteForm};
  const fields = {};
  for (const [name,max] of Object.entries(limits)) {
    if (data[name] !== undefined && typeof data[name] !== 'string') return {error:messages.invalidFieldType};
    fields[name] = (data[name] || '').trim();
    if (fields[name].length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(fields[name])) return {error:messages.invalidFieldContent};
  }
  if (!fields.name || /[\r\n]/.test(fields.name)) return {error:messages.requiredName};
  if (!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(fields.email)) return {error:messages.invalidEmail};
  if (!sessions.has(fields.session)) return {error:messages.invalidSession};
  return {fields};
}

export async function inquiryHandler(request, {messages = {}, email: publicEmail = DEFAULT_PUBLIC_EMAIL} = {}) {
  const copy = resolveMessages(messages, publicEmail);
  const secret = process.env.INQUIRY_FORM_SECRET;
  if (!secret || secret.length < 32) return failure(503,'UNAVAILABLE',copy.formUnavailable);
  const origin = request.headers.get('origin');
  const ownOrigin = new URL(request.url).origin;
  if (origin && origin !== ownOrigin) return failure(403,'INVALID_ORIGIN',copy.invalidOrigin);
  if (request.method === 'GET') {
    const existingNonce = cookieValue(request);
    const nonce = /^[a-f0-9]{48}$/.test(existingNonce) ? existingNonce : randomBytes(24).toString('hex');
    const issuedAt = Date.now();
    return json({token:sign(`${nonce}.${issuedAt}`,secret),issuedAt},200,{'Set-Cookie':cookie(request,nonce)});
  }
  if (request.method !== 'POST') return json({ok:false},405,{'Allow':'GET, POST'});
  if (!request.headers.get('content-type')?.startsWith('application/json')) return failure(415,'INVALID_FORMAT',copy.unsupportedFormat);
  if (Number(request.headers.get('content-length')) > MAX_BYTES) return failure(413,'TOO_LONG',copy.tooLong);
  let data;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw,'utf8') > MAX_BYTES) return failure(413,'TOO_LONG',copy.tooLong);
    data = JSON.parse(raw);
  } catch { return failure(400,'INVALID_FORMAT',copy.malformedRequest); }
  const result = validateInquiryFields(data, copy);
  if (result.error) return failure(400,'INVALID_FIELDS',result.error);
  if (result.fields.website) return failure(400,'INVALID_FIELDS',copy.refreshRequired);
  const nonce = cookieValue(request);
  const issuedAt = Number(data.issuedAt);
  const age = Date.now() - issuedAt;
  if (!/^[a-f0-9]{48}$/.test(nonce) || !Number.isSafeInteger(issuedAt) || age > MAX_AGE || age < 0 || typeof data.token !== 'string' || !equalSignature(data.token,sign(`${nonce}.${issuedAt}`,secret))) {
    return failure(403,'TOKEN_EXPIRED',copy.tokenExpired);
  }
  if (age < 1000) return failure(429,'TOO_SOON',copy.tooSoon);
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM) {
    console.error('inquiry_unavailable', {missingEmailConfiguration:true});
    return failure(503,'UNAVAILABLE',copy.emailUnavailable);
  }
  const {name,email,session,when,message} = result.fields;
  const payload = {
    from:process.env.RESEND_FROM,
    to:[process.env.INQUIRY_TO_EMAIL || 'walt@waltdublinphotography.com'],
    reply_to:email,
    subject:`Photography inquiry: ${session || 'Session to be discussed'}`,
    text:`A new inquiry from the Walt Dublin Photography website.\n\nName: ${name}\nEmail: ${email}\nSession: ${session || 'Still deciding'}\nTiming: ${when || 'Not specified'}\n\n${message || 'No additional message supplied.'}\n\nReply to this email to respond directly to ${name}.`
  };
  const idempotencyKey = `wdp-inquiry/${createHash('sha256').update(nonce + JSON.stringify(payload)).digest('hex')}`;
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method:'POST', headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':idempotencyKey},
      body:JSON.stringify(payload), signal:AbortSignal.timeout(15000)
    });
    const responseBody = await response.json().catch(()=>({}));
    if (!response.ok || !responseBody.id) {
      console.error('inquiry_provider_rejected', {status:response.status,code:responseBody.name || 'unknown'});
      return failure(502,'SEND_FAILED',copy.sendUnconfirmed);
    }
    console.info('inquiry_accepted', {messageId:responseBody.id});
    return json({ok:true});
  } catch (error) {
    console.error('inquiry_provider_error', {kind:error.name});
    return failure(502,'SEND_FAILED',copy.sendUnconfirmed);
  }
}
