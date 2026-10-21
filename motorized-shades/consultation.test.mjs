import {test} from 'node:test';
import assert from 'node:assert/strict';
import {submitConsultation, GHL_BASE_URL, LEAD_TAG} from './consultation.mjs';

const env = {GHL_PRIVATE_TOKEN: 'pit-test', GHL_LOCATION_ID: 'location-1'};
const valid = {firstName:'Test', lastName:'Person', phone:'(512) 555-0123', email:'test@example.com'};
const mustNotCall = () => {throw Error('must not call');};
const reply = (status, body) => async () => ({ok: status < 300, status, json: async () => body});

// A stand-in for GHL that records every request and answers each path in turn.
function fakeGhl({upsert = reply(201, {new: true, contact: {id: 'contact-1'}}), tags = reply(201, {}), notes = reply(201, {})} = {}) {
  const calls = [];
  const fetcher = async (url, request) => {
    calls.push({url, method: request.method, headers: request.headers, body: JSON.parse(request.body)});
    if (url === `${GHL_BASE_URL}/contacts/upsert`) return upsert();
    if (url === `${GHL_BASE_URL}/contacts/contact-1/tags`) return tags();
    if (url === `${GHL_BASE_URL}/contacts/contact-1/notes`) return notes();
    throw Error(`unexpected ${url}`);
  };
  return {calls, fetcher};
}

test('incomplete and spam requests never reach GHL', async () => {
  for (const data of [null, [], {}, {...valid, phone:'123'}, {...valid, companyWebsite:'spam'}, {...valid, email:'invalid'}, {...valid, product:'unknown'}, {...valid, product:'toString'}]) {
    const result = await submitConsultation(data, {env, fetcher: mustNotCall, rateLimited: mustNotCall});
    assert.equal(result.status, 400);
    assert.equal(result.body.success, false);
  }
});

test('creates the motorized lead in GHL tagged google_landing_page and never website-lead', async () => {
  const ghl = fakeGhl();
  const result = await submitConsultation({...valid, firstName:' Test ', email:' Test@Example.com '}, {env, fetcher: ghl.fetcher});
  assert.deepEqual(result, {status: 200, body: {success: true}});
  assert.deepEqual(ghl.calls.map(call => call.url), [
    `${GHL_BASE_URL}/contacts/upsert`, `${GHL_BASE_URL}/contacts/contact-1/tags`, `${GHL_BASE_URL}/contacts/contact-1/notes`,
  ]);
  for (const call of ghl.calls) {
    assert.equal(call.method, 'POST');
    assert.equal(call.headers.Authorization, 'Bearer pit-test');
    assert.equal(call.headers.Version, '2021-07-28');
  }
  const [upsert, tags, note] = ghl.calls.map(call => call.body);
  assert.deepEqual(upsert, {
    locationId: 'location-1', name: 'Test Person', firstName: 'Test', lastName: 'Person',
    email: 'test@example.com', phone: '(512) 555-0123',
    source: 'Beacon Blinds Website - Motorized shades landing page consultation',
  });
  assert.deepEqual(tags, {tags: ['beacon-blinds', 'service-motorized-smart-home', 'sms-consent-no', 'google_landing_page']});
  assert.equal(LEAD_TAG, 'google_landing_page');
  assert.deepEqual(note.body.split('\n'), [
    'Service type: Motorized & Smart Home',
    'Customer message: Request for a free in-home consultation for motorized shades.',
    'SMS consent: NO',
    'Source page: /motorized-shades/',
    'Form: Motorized shades landing page consultation',
    'Campaign: google_landing_page',
  ]);
  assert.ok(!JSON.stringify(ghl.calls).includes('website-lead'));
});

test('exterior inquiries use the outdoor service, and the visitor cannot set routing', async () => {
  const ghl = fakeGhl();
  const result = await submitConsultation({
    ...valid, product: 'exterior-shades', sourcePage: '/fake/', serviceType: 'fake',
    formName: 'fake', campaignTag: 'fake', tags: ['website-lead'], source: 'fake',
  }, {env, fetcher: ghl.fetcher});
  assert.equal(result.body.success, true);
  const [upsert, tags, note] = ghl.calls.map(call => call.body);
  assert.equal(upsert.source, 'Beacon Blinds Website - Exterior shades landing page consultation');
  assert.equal(upsert.tags, undefined);
  assert.deepEqual(tags, {tags: ['beacon-blinds', 'service-solar-exterior-shades', 'sms-consent-no', 'google_landing_page']});
  assert.deepEqual(note.body.split('\n'), [
    'Service type: Solar & Exterior Shades',
    'Customer message: Request for a free in-home consultation for exterior shades.',
    'SMS consent: NO',
    'Source page: /exterior-shades/',
    'Form: Exterior shades landing page consultation',
    'Campaign: google_landing_page',
  ]);
});

test('records SMS consent only when it is explicitly true', async () => {
  for (const consent of [undefined, 'true', true]) {
    const ghl = fakeGhl();
    await submitConsultation({...valid, smsConsent: consent}, {env, fetcher: ghl.fetcher});
    const expected = consent === true ? 'yes' : 'no';
    assert.ok(ghl.calls[1].body.tags.includes(`sms-consent-${expected}`));
    assert.ok(ghl.calls[2].body.body.includes(`SMS consent: ${expected.toUpperCase()}`));
  }
});

test('refuses to send without credentials', async t => {
  t.mock.method(console, 'error', () => {});
  for (const missing of [{}, {GHL_PRIVATE_TOKEN: 'pit-test'}, {GHL_LOCATION_ID: 'location-1'}, {GHL_PRIVATE_TOKEN: ' ', GHL_LOCATION_ID: 'location-1'}]) {
    const result = await submitConsultation(valid, {env: missing, fetcher: mustNotCall});
    assert.equal(result.status, 500);
    assert.match(result.body.error, /\(830\) 364-4591/);
  }
});

test('never reports success unless GHL confirms the contact and its tags', async t => {
  t.mock.method(console, 'error', () => {});
  for (const ghl of [
    fakeGhl({upsert: reply(401, {message: 'Invalid JWT'})}),
    fakeGhl({upsert: reply(422, {contact: {id: 'contact-1'}})}),
    fakeGhl({upsert: reply(200, {contact: {}})}),
    fakeGhl({upsert: reply(200, {})}),
    fakeGhl({upsert: async () => ({ok: true, status: 200, json: async () => {throw new SyntaxError('Unexpected token <');}})}),
    fakeGhl({upsert: async () => {throw new TypeError('fetch failed');}}),
    fakeGhl({tags: reply(400, {})}),
    fakeGhl({tags: async () => {throw new DOMException('timed out', 'TimeoutError');}}),
  ]) {
    const result = await submitConsultation(valid, {env, fetcher: ghl.fetcher});
    assert.equal(result.status, 502);
    assert.equal(result.body.success, false);
    assert.match(result.body.error, /\(830\) 364-4591/);
  }
});

test('a lead that is in GHL with its tags succeeds even if the note fails', async t => {
  const logged = t.mock.method(console, 'error', () => {});
  for (const notes of [reply(500, {}), async () => {throw new TypeError('fetch failed');}]) {
    const result = await submitConsultation(valid, {env, fetcher: fakeGhl({notes}).fetcher});
    assert.deepEqual(result, {status: 200, body: {success: true}});
  }
  assert.equal(logged.mock.callCount(), 2);
});

test('rate-limited visitors are told to wait, and only valid leads count toward the limit', async () => {
  const limited = await submitConsultation(valid, {env, fetcher: mustNotCall, rateLimited: () => true});
  assert.equal(limited.status, 429);
  assert.match(limited.body.error, /\(830\) 364-4591/);
  let checks = 0;
  await submitConsultation({...valid, phone: '1'}, {env, fetcher: mustNotCall, rateLimited: () => {checks++; return false;}});
  assert.equal(checks, 0);
});
