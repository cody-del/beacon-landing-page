const form = document.querySelector('#consultation-form');
const button = form.querySelector('button[type="submit"]');
const errorBox = document.querySelector('#form-error');
const fields = ['firstName', 'lastName', 'phone', 'email'];
let pending = false;

// Google Ads conversion "SS - Submit Lead Form" — the same action beaconblinds.com
// reports to (src/lib/gtag.ts in beacon-blinds-rebuild). This page cannot rely on
// that one: leads from here reach beaconblinds.com server to server, so the main
// site's browser-side conversion never runs for them.
const LEAD_CONVERSION = 'AW-16673765845/cNjoCN3wx8EcENXz1Y4-';

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
    try {
      const hash = await hashedEmail(email);
      if (hash) window.gtag('set', 'user_data', {sha256_email_address: hash});
    } catch {
      // Send the conversion without user data rather than not at all.
    }
    window.gtag('event', 'conversion', {send_to: LEAD_CONVERSION, form_name: 'Motorized shades landing page consultation'});
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
  try {
    const payload = Object.fromEntries(new FormData(form));
    payload.smsConsent = false;
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
    pending = false;
    button.disabled = false;
    button.textContent = 'Get My Free Consultation';
    form.removeAttribute('aria-busy');
  }
});
