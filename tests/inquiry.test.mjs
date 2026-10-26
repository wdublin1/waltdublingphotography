import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import test from 'node:test';
import {inquiryHandler, validateInquiry} from '../lib/inquiry.mjs';

const ORIGIN = 'https://photography.example';
const ENDPOINT = `${ORIGIN}/api/inquiry`;
const ENV_NAMES = ['INQUIRY_FORM_SECRET', 'RESEND_API_KEY', 'RESEND_FROM', 'INQUIRY_TO_EMAIL'];
const VALID_FIELDS = {
  name: 'Jordan Example',
  email: 'jordan@example.net',
  session: 'Family portraits',
  when: 'Next month',
  message: 'I would like to ask about a family session.',
  website: ''
};

function setup(t, send = async () => Response.json({id: 'test-provider-message'})) {
  const previous = Object.fromEntries(ENV_NAMES.map(name => [name, process.env[name]]));
  Object.assign(process.env, {
    INQUIRY_FORM_SECRET: randomBytes(48).toString('hex'),
    RESEND_API_KEY: 'test-only-not-a-real-resend-key',
    RESEND_FROM: 'Photography test <inquiries@example.test>',
    INQUIRY_TO_EMAIL: 'owner@example.test'
  });
  t.after(() => {
    for (const name of ENV_NAMES) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  });
  let now = 1_800_000_000_000;
  t.mock.method(Date, 'now', () => now);
  const fetchMock = t.mock.method(globalThis, 'fetch', send);
  t.mock.method(console, 'error', () => {});
  t.mock.method(console, 'info', () => {});

  return {
    fetchMock,
    advance(milliseconds = 2000) { now += milliseconds; },
    async begin(existingCookie) {
      const response = await inquiryHandler(new Request(ENDPOINT, {
        headers: {origin: ORIGIN, ...(existingCookie ? {cookie: existingCookie} : {})}
      }));
      assert.equal(response.status, 200);
      const setCookie = response.headers.get('set-cookie');
      assert.match(setCookie, /HttpOnly/);
      assert.match(setCookie, /SameSite=Strict/);
      assert.match(setCookie, /Secure/);
      const auth = await response.json();
      return {auth, cookie: setCookie.split(';', 1)[0]};
    }
  };
}

function postRequest(session, fields = {}, headers = {}) {
  return rawRequest({...VALID_FIELDS, ...session.auth, ...fields}, session.cookie, headers);
}

function rawRequest(body, cookie, headers = {}) {
  return new Request(ENDPOINT, {
    method: 'POST',
    headers: {'content-type': 'application/json', origin: ORIGIN, cookie, ...headers},
    body: typeof body === 'string' ? body : JSON.stringify(body)
  });
}

async function assertFailure(response, status, code) {
  assert.equal(response.status, status);
  const body = await response.json();
  assert.equal(body.ok, false);
  assert.equal(body.code, code);
  assert.equal(typeof body.message, 'string');
  assert.ok(body.message.length > 0);
  return body;
}

test('validation rejects invalid names, email addresses, session types, and field types', () => {
  for (const fields of [
    {name: ''},
    {name: '   '},
    {name: 'Jordan\r\nBcc: someone@example.net'},
    {name: 'a'.repeat(121)},
    {name: {value: 'Jordan'}},
    {email: ''},
    {email: 'not-an-email'},
    {email: 'jordan@localhost'},
    {email: 'Jordan <jordan@example.net>'},
    {email: 'jordan@example.net\r\nBcc: someone@example.net'},
    {session: 'Unrecognized package'},
    {session: 'Family portraits\nBcc: someone@example.net'},
    {message: ['not', 'a', 'string']},
    {message: 'bad\u0000character'}
  ]) {
    assert.equal(typeof validateInquiry({...VALID_FIELDS, ...fields}).error, 'string', JSON.stringify(fields));
  }
  for (const value of [null, [], 'not an object']) assert.ok(validateInquiry(value).error);
  const result = validateInquiry({...VALID_FIELDS, name: '  Jordan Example  ', session: ''});
  assert.equal(result.fields.name, 'Jordan Example');
  assert.equal(result.fields.session, '');
});

test('invalid name, email, session, and honeypot are rejected before contacting Resend', async t => {
  const state = setup(t);
  const session = await state.begin();
  state.advance();
  for (const fields of [{name: ''}, {email: 'bad'}, {session: 'Forged package'}, {website: 'https://spam.example'}]) {
    await assertFailure(await inquiryHandler(postRequest(session, fields)), 400, 'INVALID_FIELDS');
  }
  assert.equal(state.fetchMock.mock.callCount(), 0);
});

test('submitted markup remains plain text and cannot control email routing or headers', async t => {
  const state = setup(t);
  const session = await state.begin();
  state.advance();
  const name = '<img src=x onerror=alert(1)>';
  const message = '<script>alert("xss")</script>\n<a href="javascript:alert(1)">click</a>\nBcc: attacker@example.net';
  const response = await inquiryHandler(postRequest(session, {
    name,
    message,
    html: '<script>should not be sent as HTML</script>',
    to: 'attacker@example.net',
    from: 'attacker@example.net',
    subject: 'Attacker controlled subject'
  }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {ok: true});
  assert.equal(state.fetchMock.mock.callCount(), 1);
  const [url, options] = state.fetchMock.mock.calls[0].arguments;
  const payload = JSON.parse(options.body);
  assert.equal(url, 'https://api.resend.com/emails');
  assert.equal(options.method, 'POST');
  assert.equal(payload.from, 'Photography test <inquiries@example.test>');
  assert.deepEqual(payload.to, ['owner@example.test']);
  assert.equal(payload.reply_to, VALID_FIELDS.email);
  assert.equal(payload.subject, 'Photography inquiry: Family portraits');
  assert.equal(Object.hasOwn(payload, 'html'), false);
  assert.ok(payload.text.includes(name));
  assert.ok(payload.text.includes(message));
  assert.equal(Object.hasOwn(payload, 'bcc'), false);
  assert.equal(Object.hasOwn(payload, 'cc'), false);
  assert.doesNotMatch(response.headers.get('set-cookie') || '', /Max-Age=0|1970/);
});

test('tampered, missing, expired, future-dated, and wrong-cookie tokens cannot send', async t => {
  const state = setup(t);
  const session = await state.begin();
  state.advance();
  const changedToken = `${session.auth.token[0] === '0' ? '1' : '0'}${session.auth.token.slice(1)}`;
  for (const [fields, headers] of [
    [{token: changedToken}, {}],
    [{token: 'not-a-signature'}, {}],
    [{token: undefined}, {}],
    [{issuedAt: session.auth.issuedAt + 60_000}, {}],
    [{issuedAt: session.auth.issuedAt - 1}, {}],
    [{}, {cookie: ''}],
    [{}, {cookie: `wdp_inquiry=${randomBytes(24).toString('hex')}`}]
  ]) {
    await assertFailure(await inquiryHandler(postRequest(session, fields, headers)), 403, 'TOKEN_EXPIRED');
  }
  state.advance(2 * 60 * 60 * 1000);
  await assertFailure(await inquiryHandler(postRequest(session)), 403, 'TOKEN_EXPIRED');
  assert.equal(state.fetchMock.mock.callCount(), 0);
});

test('cross-origin GET and POST requests are rejected', async t => {
  const state = setup(t);
  const session = await state.begin();
  state.advance();
  await assertFailure(await inquiryHandler(new Request(ENDPOINT, {
    headers: {origin: 'https://unrelated.example'}
  })), 403, 'INVALID_ORIGIN');
  await assertFailure(await inquiryHandler(postRequest(session, {}, {
    origin: 'https://unrelated.example'
  })), 403, 'INVALID_ORIGIN');
  assert.equal(state.fetchMock.mock.callCount(), 0);
});

test('a submission made before the minimum delay cannot send', async t => {
  const state = setup(t);
  const session = await state.begin();
  await assertFailure(await inquiryHandler(postRequest(session)), 429, 'TOO_SOON');
  assert.equal(state.fetchMock.mock.callCount(), 0);
});

test('missing email credentials return unavailable rather than a false acceptance', async t => {
  const state = setup(t);
  const session = await state.begin();
  state.advance();
  for (const name of ['RESEND_API_KEY', 'RESEND_FROM']) {
    const value = process.env[name];
    delete process.env[name];
    const body = await assertFailure(await inquiryHandler(postRequest(session)), 503, 'UNAVAILABLE');
    assert.match(body.message, /walt@waltdublinphotography\.com/);
    process.env[name] = value;
  }
  assert.equal(state.fetchMock.mock.callCount(), 0);
});

test('missing or short form secret cannot issue a working token', async t => {
  const state = setup(t);
  for (const value of ['', 'too-short']) {
    process.env.INQUIRY_FORM_SECRET = value;
    await assertFailure(await inquiryHandler(new Request(ENDPOINT)), 503, 'UNAVAILABLE');
  }
  assert.equal(state.fetchMock.mock.callCount(), 0);
});

test('body size limits apply to declared length and actual UTF-8 bytes', async t => {
  const state = setup(t);
  const session = await state.begin();
  state.advance();
  await assertFailure(await inquiryHandler(postRequest(session, {}, {
    'content-length': '14001'
  })), 413, 'TOO_LONG');
  const body = {...VALID_FIELDS, ...session.auth, padding: 'é'.repeat(7200)};
  assert.ok(JSON.stringify(body).length < 14000);
  assert.ok(Buffer.byteLength(JSON.stringify(body), 'utf8') > 14000);
  await assertFailure(await inquiryHandler(rawRequest(body, session.cookie)), 413, 'TOO_LONG');
  assert.equal(state.fetchMock.mock.callCount(), 0);
});

test('invalid JSON and unsupported content types cannot reach the provider', async t => {
  const state = setup(t);
  const session = await state.begin();
  state.advance();
  await assertFailure(await inquiryHandler(rawRequest('{broken json', session.cookie)), 400, 'INVALID_FORMAT');
  await assertFailure(await inquiryHandler(postRequest(session, {}, {
    'content-type': 'text/plain'
  })), 415, 'INVALID_FORMAT');
  assert.equal(state.fetchMock.mock.callCount(), 0);
});

test('Resend rejection, malformed success, and network failure are reported honestly', async t => {
  const providerResults = [
    () => Response.json({name: 'rate_limit_exceeded'}, {status: 429}),
    () => Response.json({name: 'validation_error'}, {status: 400}),
    () => Response.json({}, {status: 200}),
    () => new Response('not json', {status: 200}),
    () => { throw new TypeError('Simulated network failure'); },
    () => { throw new DOMException('Simulated timeout', 'TimeoutError'); }
  ];
  const state = setup(t, async () => providerResults.shift()());
  const session = await state.begin();
  state.advance();
  const count = providerResults.length;
  for (let index = 0; index < count; index += 1) {
    const body = await assertFailure(await inquiryHandler(postRequest(session)), 502, 'SEND_FAILED');
    assert.match(body.message, /couldn’t confirm/i);
    assert.match(body.message, /walt@waltdublinphotography\.com/);
  }
  assert.equal(state.fetchMock.mock.callCount(), count);
});

test('retrying an unchanged POST uses the same provider idempotency key', async t => {
  let attempt = 0;
  const state = setup(t, async () => {
    attempt += 1;
    if (attempt === 1) throw new TypeError('Simulated ambiguous delivery failure');
    return Response.json({id: 'same-provider-message'});
  });
  const session = await state.begin();
  state.advance();
  await assertFailure(await inquiryHandler(postRequest(session)), 502, 'SEND_FAILED');
  const response = await inquiryHandler(postRequest(session));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {ok: true});
  const keys = state.fetchMock.mock.calls.map(call => call.arguments[1].headers['Idempotency-Key']);
  assert.equal(keys.length, 2);
  assert.match(keys[0], /^wdp-inquiry\/[a-f0-9]{64}$/);
  assert.equal(keys[0], keys[1]);
});

test('refreshing a token retains the cookie and unchanged-inquiry idempotency key', async t => {
  const state = setup(t);
  const first = await state.begin();
  state.advance();
  assert.equal((await inquiryHandler(postRequest(first))).status, 200);
  const refreshed = await state.begin(first.cookie);
  assert.equal(refreshed.cookie, first.cookie);
  assert.notEqual(refreshed.auth.issuedAt, first.auth.issuedAt);
  state.advance();
  assert.equal((await inquiryHandler(postRequest(refreshed))).status, 200);
  const keys = state.fetchMock.mock.calls.map(call => call.arguments[1].headers['Idempotency-Key']);
  assert.equal(keys[0], keys[1], 'Refreshing CSRF credentials must not create a second email for the same retry.');
  assert.equal((await inquiryHandler(postRequest(refreshed, {message: 'A genuinely different inquiry.'}))).status, 200);
  const differentKey = state.fetchMock.mock.calls[2].arguments[1].headers['Idempotency-Key'];
  assert.notEqual(differentKey, keys[0]);
});
