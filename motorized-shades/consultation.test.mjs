import {test} from 'node:test';
import assert from 'node:assert/strict';
import {submitConsultation} from './consultation.mjs';
const valid = {firstName:'Test', lastName:'Person', phone:'(512) 555-0123', email:'test@example.com'};
test('incomplete and spam requests never contact Beacon', async () => {
  let calls = 0;
  const fetcher = () => {calls++; throw Error('must not call');};
  for (const data of [{}, {...valid, phone:'123'}, {...valid, companyWebsite:'spam'}, {...valid, email:'invalid'}, {...valid, product:'unknown'}]) {
    assert.equal((await submitConsultation(data, fetcher)).status, 400);
  }
  assert.equal(calls, 0);
});
test('routes to Beacon with the correct service and explicit SMS consent', async () => {
  for (const consent of [undefined, 'true', true]) {
    const result = await submitConsultation({...valid, smsConsent:consent}, async (url, request) => {
      assert.equal(url, 'https://beaconblinds.com/api/contact/');
      const body = JSON.parse(request.body);
      assert.equal(body.name, 'Test Person');
      assert.equal(body.serviceType, 'Motorized & Smart Home');
      assert.equal(body.sourcePage, '/motorized-shades/');
      assert.equal(body.formName, 'Motorized shades landing page consultation');
      assert.equal(body.smsConsent, consent === true);
      assert.equal(body.campaignTag, 'google_landing_page');
      return {ok:true, json:async()=>({success:true})};
    });
    assert.equal(result.body.success, true);
  }
});
test('exterior inquiries use the outdoor service and server-owned attribution', async () => {
  const result = await submitConsultation({
    ...valid, product: 'exterior-shades', sourcePage: '/fake/', serviceType: 'fake',
    formName: 'fake', campaignTag: 'fake',
  }, async (url, request) => {
    assert.equal(url, 'https://beaconblinds.com/api/contact/');
    const body = JSON.parse(request.body);
    assert.equal(body.serviceType, 'Solar & Exterior Shades');
    assert.equal(body.sourcePage, '/exterior-shades/');
    assert.equal(body.formName, 'Exterior shades landing page consultation');
    assert.equal(body.message, 'Request for a free in-home consultation for exterior shades.');
    assert.equal(body.campaignTag, 'google_landing_page');
    assert.equal(body.smsConsent, false);
    return {ok: true, json: async () => ({success: true})};
  });
  assert.equal(result.body.success, true);
});
test('never reports success for a rejection, invalid response or network failure', async () => {
  for (const fetcher of [async()=>({ok:false,json:async()=>({success:true})}),async()=>({ok:true,json:async()=>({})}),async()=>{throw Error('network');}]) {
    const result = await submitConsultation(valid, fetcher);
    assert.equal(result.status, 502);
    assert.equal(result.body.success, false);
  }
});
