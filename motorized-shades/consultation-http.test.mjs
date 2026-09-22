import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createConsultationHandler} from './consultation-http.mjs';

const origin = 'https://beaconblindsland.netlify.app';
const request = (body = '{}', headers = {}) => new Request(`${origin}/api/consultation`, {
  method: 'POST', headers: {'Origin': origin, 'Content-Type': 'application/json', ...headers}, body,
});

test('HTTP guards reject invalid requests before forwarding', async () => {
  const handle = createConsultationHandler(() => {throw Error('Must not forward');});
  for (const [input, status] of [
    [new Request(`${origin}/api/consultation`), 405],
    [request('{}', {Origin: 'https://example.com'}), 403],
    [request('{}', {'Content-Type': 'text/plain'}), 415],
    [request('invalid json'), 400],
    [request('x'.repeat(8193)), 413],
    [request('{}', {'Content-Length': '8193'}), 413],
  ]) assert.equal((await handle(input)).status, status);
});

test('HTTP adapter preserves submission results and disables caching', async () => {
  const data = {firstName: 'Test', smsConsent: false};
  for (const status of [200, 400, 502]) {
    const body = {success: status === 200};
    const handle = createConsultationHandler(async received => {
      assert.deepEqual(received, data);
      return {status, body};
    });
    const response = await handle(request(JSON.stringify(data)));
    assert.equal(response.status, status);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await response.json(), body);
  }
});

test('deployed function rejects an empty lead without calling Beacon', async () => {
  const {default: handle, config} = await import('../netlify/functions/consultation.mjs');
  assert.equal(config.path, '/api/consultation');
  assert.equal((await handle(request())).status, 400);
});
