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

// Runs form.js against a stub page, submits once, and returns every gtag call. By default the
// Turnstile script fails to load; pass a `turnstile` stub to have it load instead.
async function submitForm({hostname, ok = true, body = {success: true}, turnstile, sent = [], scripts = [], clock = {now: 0}, beforeSubmit = () => {}} = {}) {
  const values = {firstName: 'Jane', lastName: 'Doe', phone: '(830) 555-0100', email: 'jane@example.com', product: 'motorized-shades'};
  const node = () => ({hidden: true, textContent: '', disabled: false, setAttribute() {}, removeAttribute() {}, getAttribute: () => null, addEventListener() {}, focus() {}, before() {}});
  const elements = Object.fromEntries(Object.entries(values).map(([name, value]) => [name, {...node(), value, validity: {valid: true}}]));
  const listeners = {};
  const form = {...node(), elements, querySelector: node, addEventListener: (name, callback) => { listeners[name] = callback; }, reset() {}};
  const calls = [];
  const window = {gtag: (...args) => calls.push(args), location: {hostname, pathname: '/'}};
  vm.runInNewContext(formJs, {
    window,
    document: {
      querySelector: selector => selector === '#consultation-form' ? form : node(),
      createElement: () => ({}),
      head: {append: script => {
        scripts.push(script.src);
        queueMicrotask(() => { if (turnstile) { window.turnstile = turnstile; window.onTurnstileLoad(); } else script.onerror(); });
      }},
    },
    FormData: class { *[Symbol.iterator]() { yield* Object.entries(values); } },
    fetch: async (url, init) => { sent.push(JSON.parse(init.body)); return {ok, json: async () => body}; },
    AbortSignal: {timeout: () => undefined},
    // form.js's own waits (the 8-second wait for a Turnstile token) run instantly here.
    globalThis: {}, TextEncoder, Uint8Array, setTimeout: callback => setImmediate(callback),
    Date: {now: () => clock.now},
  });
  await new Promise(resolve => setTimeout(resolve, 0));
  beforeSubmit();
  await listeners.submit({preventDefault() {}});
  await new Promise(resolve => setTimeout(resolve, 0));
  return JSON.parse(JSON.stringify(calls));
}

test('Turnstile: the live key only on go.beaconblinds.com, the token sent and the widget reset', async () => {
  for (const [hostname, sitekey] of [['go.beaconblinds.com', '0x4AAAAAAF2pY6JkEWdgaHa3'], ...NOT_PRODUCTION.map(host => [host, '1x00000000000000000000AA'])]) {
    const rendered = [];
    let resets = 0;
    const sent = [];
    const scripts = [];
    const turnstile = {render: (container, options) => { rendered.push(options); return 'w1'; }, getResponse: () => 'token-1', reset: () => { resets++; }};
    await submitForm({hostname, turnstile, sent, scripts});
    assert.deepEqual(scripts, ['https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad']);
    assert.equal(rendered[0].sitekey, sitekey, hostname);
    assert.equal(rendered[0].size, 'flexible');
    assert.equal(rendered[0].appearance, 'interaction-only');
    assert.equal(sent[0]['cf-turnstile-response'], 'token-1');
    assert.equal(resets, 1);
  }
});

// A stub widget that issues `token-N` and counts resets; each reset issues the next token.
function staleWidget({expired = false} = {}) {
  const state = {resets: 0, options: null, token: 'token-1', expired};
  state.turnstile = {
    render: (container, options) => { state.options = options; options.callback(state.token); return 'w1'; },
    getResponse: () => state.token,
    isExpired: () => state.expired,
    reset: () => { state.resets++; state.expired = false; state.token = `token-${state.resets + 1}`; state.options.callback(state.token); },
  };
  return state;
}

test('Turnstile: an expired token is swapped for a fresh one before sending', async () => {
  const widget = staleWidget({expired: true});
  const sent = [];
  await submitForm({hostname: 'go.beaconblinds.com', turnstile: widget.turnstile, sent});
  assert.equal(widget.options['refresh-expired'], 'auto');
  assert.equal(sent[0]['cf-turnstile-response'], 'token-2');
  assert.equal(widget.resets, 2); // once before sending, once after
});

test('Turnstile: a token older than 270 s is swapped for a fresh one; a newer one is kept', async () => {
  for (const [age, expected] of [[271000, 'token-2'], [200000, 'token-1']]) {
    const widget = staleWidget();
    const sent = [];
    const clock = {now: 1000};
    await submitForm({hostname: 'go.beaconblinds.com', turnstile: widget.turnstile, sent, clock, beforeSubmit: () => { clock.now += age; }});
    assert.equal(sent[0]['cf-turnstile-response'], expected, `age ${age}`);
  }
});

test('Turnstile: no lead is sent while Cloudflare is asking for a tick', async () => {
  const sent = [];
  const turnstile = {render: (container, options) => { options['before-interactive-callback'](); return 'w1'; }, getResponse: () => '', reset() {}};
  assert.deepEqual(await submitForm({hostname: 'go.beaconblinds.com', turnstile, sent}), []);
  assert.equal(sent.length, 0);
});

test('Turnstile: a failed script still sends the lead, with an empty token', async () => {
  const sent = [];
  await submitForm({hostname: 'go.beaconblinds.com', sent});
  assert.equal(sent.length, 1);
  assert.equal(sent[0]['cf-turnstile-response'], '');
});

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
