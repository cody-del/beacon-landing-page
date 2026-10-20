import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

// Beacon's Google Ads account. From Sep 30 to Oct 13, 2026 the call snippet pointed at
// AW-726943250, which is the Naples Shutter account, so calls from this page counted for
// neither business and Beacon's own "Call ((830) 364-4591)" action recorded nothing.
const ADS_ID = 'AW-16673765845';
const CALL_LABEL = '4h04CM2734sdENXz1Y4-';
const LEAD_LABEL = 'cNjoCN3wx8EcENXz1Y4-';
const PHONE = '(830) 364-4591';

const formJs = await readFile(new URL('./dist/form.js', import.meta.url), 'utf8');
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
