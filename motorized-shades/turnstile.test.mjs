import {test} from 'node:test';
import assert from 'node:assert/strict';
import {verifyHuman, SITEVERIFY_URL, TOKEN_FIELD} from './turnstile.mjs';
import {createConsultationHandler} from './consultation-http.mjs';

// The secret is passed explicitly, so a build's real TURNSTILE_SECRET_KEY is never read.
const env = {TURNSTILE_SECRET_KEY: 'test-secret-not-real'};
// Answers siteverify with `answer` and records what was asked.
function cloudflare(answer) {
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push({url, body: new URLSearchParams(init.body)});
    if (answer instanceof Error) throw answer;
    if (answer instanceof Response) return answer;
    return Response.json(answer);
  };
  return {calls, fetcher};
}

test('without a secret the check is off and Cloudflare is not called', async () => {
  const {calls, fetcher} = cloudflare({success: false});
  assert.equal(await verifyHuman(undefined, '1.2.3.4', {fetcher, env: {}}), true);
  assert.equal(await verifyHuman(undefined, '1.2.3.4', {fetcher, env: {TURNSTILE_SECRET_KEY: ' '}}), true);
  assert.equal(calls.length, 0);
});

test('a token Cloudflare accepts passes, sent with the secret and the visitor IP', async () => {
  const {calls, fetcher} = cloudflare({success: true});
  assert.equal(await verifyHuman('token-1', '1.2.3.4', {fetcher, env}), true);
  assert.equal(calls[0].url, SITEVERIFY_URL);
  assert.deepEqual(Object.fromEntries(calls[0].body), {secret: 'test-secret-not-real', response: 'token-1', remoteip: '1.2.3.4'});
  await verifyHuman('token-1', 'unknown', {fetcher, env});
  assert.equal(calls[1].body.has('remoteip'), false);
});

test('missing, oversized or refused tokens fail', async () => {
  const {calls, fetcher} = cloudflare({success: false, 'error-codes': ['invalid-input-response']});
  for (const token of [undefined, '', 42, 'x'.repeat(2049)]) assert.equal(await verifyHuman(token, 'ip', {fetcher, env}), false);
  assert.equal(calls.length, 0);
  assert.equal(await verifyHuman('forged', 'ip', {fetcher, env}), false);
});

test('Cloudflare unreachable, timing out, failing or not answering JSON lets the lead through', async () => {
  for (const answer of [new Error('down'), new DOMException('timed out', 'TimeoutError'), new Response('busy', {status: 503}), new Response('<html>')]) {
    const {fetcher} = cloudflare(answer);
    assert.equal(await verifyHuman('token-1', 'ip', {fetcher, env}), true);
  }
});

const origin = 'https://go.beaconblinds.com';
const lead = {firstName: 'Jane', lastName: 'Doe', phone: '(830) 555-0100', email: 'jane@example.com', product: 'motorized-shades', smsConsent: false};
const post = handle => handle(new Request(`${origin}/api/consultation`, {
  method: 'POST', headers: {Origin: origin, 'Content-Type': 'application/json'},
  body: JSON.stringify({...lead, [TOKEN_FIELD]: 'token-1'}),
}), {ip: '203.0.113.7'});

test('a refused check never reaches GHL and tells the visitor to call', async () => {
  const seen = [];
  const response = await post(createConsultationHandler(async data => { seen.push(data); return {status: 200, body: {success: true}}; }, () => false, async () => false));
  assert.equal(response.status, 403);
  const body = await response.json();
  assert.equal(body.success, false);
  assert.match(body.error, /call \(830\) 364-4591/);
  assert.equal(seen.length, 0);
});

test('an accepted check passes the lead on without the token', async () => {
  const seen = [];
  const checked = [];
  const handle = createConsultationHandler(async data => { seen.push(data); return {status: 200, body: {success: true}}; }, () => false,
    async (token, ip) => { checked.push([token, ip]); return true; });
  assert.equal((await post(handle)).status, 200);
  assert.deepEqual(checked, [['token-1', '203.0.113.7']]);
  assert.deepEqual(seen, [lead]);
});
