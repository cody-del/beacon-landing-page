import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

// Beacon's Google Ads account. From Sep 30 to Oct 13, 2026 the call snippet pointed at
// AW-726943250, which is the Naples Shutter account, so calls from this page counted for
// neither business and Beacon's own "Call ((830) 364-4591)" action recorded nothing.
const ADS_ID = 'AW-16673765845';
const CALL_LABEL = '4h04CM2734sdENXz1Y4-';
const LEAD_LABEL = 'cNjoCN3wx8EcENXz1Y4-';
const PHONE = '(830) 364-4591';

const formJs = await readFile(new URL('./dist/form.js', import.meta.url), 'utf8');
// GA4: until 2026-10-27 these pages loaded only the Ads tag, so the ad traffic they carry
// was missing from beaconblinds.com's GA4 property. Only the production host sends to it.
const GA4 = 'G-L2T4RG7EZ1';
const NOT_PRODUCTION = ['beaconblindsland.netlify.app', 'deploy-preview-7--beaconblindsland.netlify.app', '69a1b2c3d4e5f6--beaconblindsland.netlify.app', 'localhost', '127.0.0.1', 'beaconblinds.com', 'go.beaconblinds.com.evil.example'];
for (const page of ['index.html', 'exterior-shades/index.html']) {
const html = await readFile(new URL(`./dist/${page}`, import.meta.url), 'utf8');
const head = html.slice(0, html.indexOf('</head>'));
const body = html.slice(html.indexOf('<body'));

test(`${page}: loads and configures only Beacon's Google Ads account`, () => {
  assert.ok(head.includes(`<script async src="https://www.googletagmanager.com/gtag/js?id=${ADS_ID}"></script>`));
  assert.ok(head.includes(`gtag('config', '${ADS_ID}');`));
  const ids = new Set([...html.matchAll(/AW-\d+/g), ...formJs.matchAll(/AW-\d+/g)].map((m) => m[0]));
  assert.deepEqual([...ids], [ADS_ID]);
});

test(`${page}: GA4 is configured after the Ads tag on the production host only`, () => {
  const configs = hostname => {
    const context = {location: {hostname}, Date};
    context.window = context;
    vm.runInNewContext(head.match(/<script>([\s\S]*?)<\/script>/)[1], context);
    return Array.from(context.dataLayer, args => Array.from(args)).filter(([command]) => command === 'config').map(([, id]) => id);
  };
  assert.deepEqual(configs('go.beaconblinds.com'), [ADS_ID, `${ADS_ID}/${CALL_LABEL}`, GA4]);
  for (const hostname of NOT_PRODUCTION) assert.deepEqual(configs(hostname), [ADS_ID, `${ADS_ID}/${CALL_LABEL}`], hostname);
});

test(`${page}: phone calls go to Beacon's "Call ((830) 364-4591)" action`, () => {
  assert.match(head, new RegExp(`gtag\\('config', '${ADS_ID}/${CALL_LABEL}', \\{\\s*'phone_conversion_number': '\\(830\\) 364-4591'\\s*\\}\\);`));
});

test(`${page}: every number matches the call-tracking string exactly`, () => {
  // Google swaps only text identical to phone_conversion_number; any other format keeps the
  // real number and the call goes uncounted.
  const text = body.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ');
  const shown = text.match(/\(?\d{3}\)?[\s.-]*\d{3}[\s.-]*\d{4}/g) ?? [];
  assert.ok(shown.length > 0);
  assert.deepEqual([...new Set(shown)], [PHONE]);
  assert.deepEqual([...new Set(html.match(/href="tel:[^"]*"/g))], ['href="tel:+18303644591"']);
});
}

test('the lead form still reports to Beacon\'s Submit Lead Form action', () => {
  assert.ok(formJs.includes(`const LEAD_CONVERSION = '${ADS_ID}/${LEAD_LABEL}';`));
});

// Runs form.js against a stub page, submits once, and returns every gtag call.
async function submitForm({hostname, ok = true, body = {success: true}} = {}) {
  const values = {firstName: 'Jane', lastName: 'Doe', phone: '(830) 555-0100', email: 'jane@example.com', product: 'motorized-shades'};
  const node = () => ({hidden: true, textContent: '', disabled: false, setAttribute() {}, removeAttribute() {}, getAttribute: () => null, addEventListener() {}, focus() {}});
  const elements = Object.fromEntries(Object.entries(values).map(([name, value]) => [name, {...node(), value, validity: {valid: true}}]));
  const listeners = {};
  const form = {...node(), elements, querySelector: node, addEventListener: (name, callback) => { listeners[name] = callback; }, reset() {}};
  const calls = [];
  vm.runInNewContext(formJs, {
    window: {gtag: (...args) => calls.push(args), location: {hostname, pathname: '/'}},
    document: {querySelector: selector => selector === '#consultation-form' ? form : node()},
    FormData: class { *[Symbol.iterator]() { yield* Object.entries(values); } },
    fetch: async () => ({ok, json: async () => body}),
    AbortSignal: {timeout: () => undefined},
    globalThis: {}, TextEncoder, Uint8Array,
  });
  await listeners.submit({preventDefault() {}});
  await new Promise(resolve => setTimeout(resolve, 0));
  return JSON.parse(JSON.stringify(calls));
}

test('an accepted lead on the production host sends one generate_lead to GA4, before user data', async () => {
  const calls = await submitForm({hostname: 'go.beaconblinds.com'});
  assert.deepEqual(calls[0], ['event', 'generate_lead', {send_to: GA4, form_name: 'Motorized shades landing page consultation', source_page: '/'}]);
  assert.equal(calls.filter(([, name]) => name === 'generate_lead').length, 1);
  assert.equal(calls.filter(([, name]) => name === 'conversion').length, 1);
  assert.doesNotMatch(JSON.stringify(calls[0]), /jane|830/i);
});

test('GA4 gets no lead event for a rejected (honeypot) submission or off the production host', async () => {
  // consultation.mjs answers a filled honeypot with a 400, so nothing is reported.
  assert.deepEqual(await submitForm({hostname: 'go.beaconblinds.com', ok: false, body: {success: false, error: 'Unable to submit this request.'}}), []);
  for (const hostname of NOT_PRODUCTION) {
    const calls = await submitForm({hostname});
    assert.deepEqual(calls.filter(([, name]) => name === 'generate_lead'), [], hostname);
    assert.equal(calls.filter(([, name]) => name === 'conversion').length, 1, hostname);
  }
});
