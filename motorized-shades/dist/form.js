const form = document.querySelector('#consultation-form');
const button = form.querySelector('button[type="submit"]');
const errorBox = document.querySelector('#form-error');
const fields = ['firstName', 'lastName', 'phone', 'email'];
const formName = form.elements.product?.value === 'exterior-shades'
  ? 'Exterior shades landing page consultation'
  : 'Motorized shades landing page consultation';
let pending = false;

// Cloudflare Turnstile: an invisible human check on the form; consultation-http.mjs checks its
// token. The widget is "Beacon Blinds lead forms" in the gbp@shadestrategy.com Cloudflare
// account. Other hosts, such as Netlify previews and localhost, get Cloudflare's always-pass
// test key. The server only checks once TURNSTILE_SECRET_KEY is set in Netlify.
const TURNSTILE_LIVE_HOSTS = ['go.beaconblinds.com'];
const TURNSTILE_SITE_KEY = TURNSTILE_LIVE_HOSTS.includes(window.location?.hostname) ? '0x4AAAAAAF2pY6JkEWdgaHa3' : '1x00000000000000000000AA';
const human = humanCheck(form);

function humanCheck(form) {
  let widget;
  let failed = false;
  let needsTick = false;
  // When the current token arrived. Cloudflare honours a token for 300 s; a visitor who leaves
  // the tab open while filling the form can otherwise send a stale one ("timeout-or-duplicate").
  let issuedAt = 0;
  try {
    const container = document.createElement('div');
    container.className = 'lead-form-turnstile';
    form.querySelector('button[type="submit"]').before(container);
    new Promise((resolve, reject) => {
      window.onTurnstileLoad = resolve;
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad';
      script.async = true;
      script.onerror = reject;
      document.head.append(script);
    }).then(() => {
      widget = window.turnstile.render(container, {
        sitekey: TURNSTILE_SITE_KEY, action: 'consultation', size: 'flexible', appearance: 'interaction-only',
        'refresh-expired': 'auto',
        callback: () => { issuedAt = Date.now(); },
        'before-interactive-callback': () => { needsTick = true; },
        'error-callback': () => { failed = true; },
      });
    }).catch(() => { failed = true; });
  } catch {
    failed = true;
  }
  return {
    // The token; '' when the check couldn't run (the server then decides); null while the
    // visitor still has to tick the box.
    async token() {
      try {
        // A token that has expired, or is close to it, is swapped for a fresh one first.
        if (widget !== undefined && !failed && (window.turnstile.isExpired?.(widget) || (issuedAt && Date.now() - issuedAt > 270000))) {
          issuedAt = 0;
          window.turnstile.reset(widget);
        }
      } catch {}
      for (let waited = 0; waited < 8000; waited += 200) {
        if (failed) return '';
        const token = widget !== undefined && window.turnstile.getResponse(widget);
        if (token) return token;
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      return needsTick ? null : '';
    },
    // Tokens work once, so every send attempt needs a fresh one.
    reset() {
      try { if (widget !== undefined) { issuedAt = 0; window.turnstile.reset(widget); } } catch {}
    },
  };
}

// Google Ads conversion "SS - Submit Lead Form" — the same action beaconblinds.com
// reports to (src/lib/gtag.ts in beacon-blinds-rebuild). This page cannot rely on
// that one: leads from here reach beaconblinds.com server to server, so the main
// site's browser-side conversion never runs for them.
const LEAD_CONVERSION = 'AW-16673765845/cNjoCN3wx8EcENXz1Y4-';

// GA4, beaconblinds.com's property. The pages configure it on the production host
// only, and the lead event below is held to the same host.
const GA4_ID = 'G-L2T4RG7EZ1';
const GA4_HOSTNAME = 'go.beaconblinds.com';

// Enhanced conversions: the email is lowercased, trimmed and SHA-256 hashed in the
// browser, so no raw address is sent. Email only — the privacy policy's 10DLC
// passage says phone numbers are not shared with third parties, and the main site
// withholds the phone hash for that reason.
async function hashedEmail(raw) {
  const email = String(raw || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !globalThis.crypto?.subtle) return null;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(email));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

// Best effort: the lead has already reached the CRM, so tracking must never throw or
// hold up the confirmation. A missing gtag (blocked, not yet loaded) skips it.
async function trackLeadConversion(email) {
  try {
    if (typeof window.gtag !== 'function') return;
    // The main site's GA4 lead event (trackGenerateLead in beacon-blinds-rebuild), to GA4
    // only (send_to), sent before user_data is set. No name, email or phone: these
    // parameters are stored in Google Analytics.
    if (window.location?.hostname === GA4_HOSTNAME) {
      window.gtag('event', 'generate_lead', {send_to: GA4_ID, form_name: formName, source_page: window.location.pathname});
    }
    try {
      const hash = await hashedEmail(email);
      if (hash) window.gtag('set', 'user_data', {sha256_email_address: hash});
    } catch {
      // Send the conversion without user data rather than not at all.
    }
    window.gtag('event', 'conversion', {send_to: LEAD_CONVERSION, form_name: formName});
  } catch {
    // Tracking must never surface an error to the visitor.
  }
}

function fieldError(name) {
  const field = form.elements[name];
  const value = field.value.trim();
  if (!value) return `Please enter your ${name === 'firstName' ? 'first name' : name === 'lastName' ? 'last name' : name === 'phone' ? 'phone number' : 'email address'}.`;
  if (name === 'email' && !field.validity.valid) return 'Please enter a valid email address.';
  if (name === 'phone') {
    const digits = value.replace(/\D/g, '');
    if (!/^\d{10}$|^1\d{10}$/.test(digits)) return 'Please enter a 10-digit phone number.';
  }
  return '';
}

function validate(name) {
  const message = fieldError(name);
  const field = form.elements[name];
  const error = document.querySelector(`#${name}-error`);
  error.textContent = message;
  error.hidden = !message;
  field.setAttribute('aria-invalid', String(Boolean(message)));
  return !message;
}

for (const name of fields) {
  form.elements[name].addEventListener('input', () => {
    if (form.elements[name].getAttribute('aria-invalid') === 'true') validate(name);
  });
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (pending) return;
  errorBox.hidden = true;
  const invalid = fields.filter(name => !validate(name));
  if (invalid.length) {
    form.elements[invalid[0]].focus();
    return;
  }
  pending = true;
  button.disabled = true;
  button.textContent = 'Sending your request…';
  form.setAttribute('aria-busy', 'true');
  let attempted = false;
  try {
    const token = await human.token();
    if (token === null) throw new Error('Please tick the box to confirm you’re a person, then send again.');
    const payload = Object.fromEntries(new FormData(form));
    payload.smsConsent = false;
    payload['cf-turnstile-response'] = token;
    attempted = true;
    const response = await fetch('/api/consultation', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(25000),
    });
    const result = await response.json();
    if (!response.ok || result.success !== true) throw new Error(result.error || 'We couldn’t confirm your request. Please call (830) 364-4591 for help.');
    trackLeadConversion(payload.email);
    form.hidden = true;
    form.reset();
    const success = document.querySelector('#consultation-success');
    success.hidden = false;
    success.focus();
  } catch (error) {
    errorBox.textContent = error.name === 'TimeoutError' || error instanceof TypeError || error instanceof SyntaxError
      ? 'We couldn’t confirm your request. Please call (830) 364-4591 before submitting again.'
      : error.message;
    errorBox.hidden = false;
  } finally {
    if (attempted) human.reset();
    pending = false;
    button.disabled = false;
    button.textContent = 'Get My Free Consultation';
    form.removeAttribute('aria-busy');
  }
});
