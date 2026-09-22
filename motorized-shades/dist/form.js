const form = document.querySelector('#consultation-form');
const button = form.querySelector('button[type="submit"]');
const errorBox = document.querySelector('#form-error');
const fields = ['firstName', 'lastName', 'phone', 'email'];
let pending = false;

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
    payload.smsConsent = form.elements.smsConsent.checked;
    const response = await fetch('/api/consultation', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(25000),
    });
    const result = await response.json();
    if (!response.ok || result.success !== true) throw new Error(result.error || 'We couldn’t confirm your request. Please call (512) 930-1188 for help.');
    form.hidden = true;
    form.reset();
    const success = document.querySelector('#consultation-success');
    success.hidden = false;
    success.focus();
  } catch (error) {
    errorBox.textContent = error.name === 'TimeoutError' || error instanceof TypeError || error instanceof SyntaxError
      ? 'We couldn’t confirm your request. Please call (512) 930-1188 before submitting again.'
      : error.message;
    errorBox.hidden = false;
  } finally {
    pending = false;
    button.disabled = false;
    button.textContent = 'Get My Free Consultation';
    form.removeAttribute('aria-busy');
  }
});
