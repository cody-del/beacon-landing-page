export async function submitConsultation(data, fetcher = fetch) {
  const fail = (status, error) => ({status, body: {success: false, error}});
  if (!data || typeof data !== 'object' || Array.isArray(data)) return fail(400, 'Please check your contact details.');
  if (data.companyWebsite) return fail(400, 'Unable to submit this request. Please call (512) 930-1188.');
  const limits = {firstName: 100, lastName: 100, phone: 30, email: 254};
  for (const [field, limit] of Object.entries(limits)) {
    if (typeof data[field] !== 'string' || !data[field].trim() || data[field].trim().length > limit) return fail(400, 'Please complete all contact fields.');
  }
  const phone = data.phone.replace(/\D/g, '');
  if (!/^\d{10}$|^1\d{10}$/.test(phone) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) return fail(400, 'Please enter a valid phone number and email address.');
  const payload = {
    name: `${data.firstName.trim()} ${data.lastName.trim()}`,
    phone: data.phone.trim(), email: data.email.trim(),
    message: 'Request for a free in-home consultation for motorized shades.',
    serviceType: 'Motorized & Smart Home',
    smsConsent: data.smsConsent === true,
    companyWebsite: '',
    sourcePage: '/motorized-shades/',
    formName: 'Motorized shades landing page consultation',
  };
  try {
    const response = await fetcher('https://beaconblinds.com/api/contact/', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload), signal: AbortSignal.timeout(18000),
    });
    const result = await response.json();
    if (!response.ok || result.success !== true) return fail(502, 'We couldn’t confirm your request. Please call (512) 930-1188 for help.');
    return {status: 200, body: {success: true}};
  } catch {
    return fail(502, 'We couldn’t confirm your request. Please call (512) 930-1188 before submitting again.');
  }
}
