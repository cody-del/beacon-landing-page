// Leads go straight to Beacon's GoHighLevel location, the way Howard's and
// Shutter Factory's landing pages send theirs. They used to pass through
// beaconblinds.com/api/contact/, which tags every contact it creates
// `website-lead`; leads from this page must not carry that tag. The token and
// location come from this site's Netlify environment variables.
export const GHL_BASE_URL = 'https://services.leadconnectorhq.com';
const GHL_VERSION = '2021-07-28';
const PHONE = '(830) 364-4591';

// GHL matches tags literally, and its follow-up workflow triggers on this one.
// Renaming it detaches every new lead from that workflow without any error, so
// change the GHL trigger in the same sitting.
export const LEAD_TAG = 'google_landing_page';

// Everything GHL records about the request is decided here, never by the
// visitor. The service tags are the ones beaconblinds.com derives from the same
// service names, so contacts from both sites still filter together.
export const PRODUCTS = {
  'motorized-shades': {
    serviceType: 'Motorized & Smart Home',
    serviceTag: 'service-motorized-smart-home',
    message: 'Request for a free in-home consultation for motorized shades.',
    sourcePage: '/motorized-shades/',
    formName: 'Motorized shades landing page consultation',
  },
  'exterior-shades': {
    serviceType: 'Solar & Exterior Shades',
    serviceTag: 'service-solar-exterior-shades',
    message: 'Request for a free in-home consultation for exterior shades.',
    sourcePage: '/exterior-shades/',
    formName: 'Exterior shades landing page consultation',
  },
};

export async function submitConsultation(data, {fetcher = fetch, rateLimited = () => false, env = process.env} = {}) {
  const fail = (status, error) => ({status, body: {success: false, error}});
  if (!data || typeof data !== 'object' || Array.isArray(data)) return fail(400, 'Please check your contact details.');
  if (data.companyWebsite) return fail(400, `Unable to submit this request. Please call ${PHONE}.`);
  const product = data.product ?? 'motorized-shades';
  if (!Object.hasOwn(PRODUCTS, product)) return fail(400, 'Please refresh the page and try again.');
  const lead = PRODUCTS[product];
  const limits = {firstName: 100, lastName: 100, phone: 30, email: 254};
  for (const [field, limit] of Object.entries(limits)) {
    if (typeof data[field] !== 'string' || !data[field].trim() || data[field].trim().length > limit) return fail(400, 'Please complete all contact fields.');
  }
  const phone = data.phone.replace(/\D/g, '');
  if (!/^\d{10}$|^1\d{10}$/.test(phone) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) return fail(400, 'Please enter a valid phone number and email address.');
  if (rateLimited()) return fail(429, `Too many requests. Please wait a few minutes or call ${PHONE}.`);

  const token = env.GHL_PRIVATE_TOKEN?.trim();
  const locationId = env.GHL_LOCATION_ID?.trim();
  if (!token || !locationId) {
    console.error('[consultation] GHL_PRIVATE_TOKEN and GHL_LOCATION_ID are not configured');
    return fail(500, `We couldn’t send your request. Please call ${PHONE}.`);
  }
  const firstName = data.firstName.trim();
  const lastName = data.lastName.trim();
  const smsConsent = data.smsConsent === true;
  const headers = {Authorization: `Bearer ${token}`, Version: GHL_VERSION, 'Content-Type': 'application/json', Accept: 'application/json'};
  // One deadline for the whole exchange: Netlify stops synchronous functions
  // after 10 seconds.
  const signal = AbortSignal.timeout(9000);
  const post = (path, body) => fetcher(`${GHL_BASE_URL}${path}`, {method: 'POST', headers, body: JSON.stringify(body), signal});

  let contactPath;
  try {
    const upsert = await post('/contacts/upsert', {
      locationId,
      name: `${firstName} ${lastName}`,
      firstName,
      lastName,
      email: data.email.trim().toLowerCase(),
      phone: data.phone.trim(),
      // The source beaconblinds.com gave these leads, kept so GHL filters and
      // reports on it still match.
      source: `Beacon Blinds Website - ${lead.formName}`,
    });
    const result = await upsert.json();
    const contactId = result?.contact?.id ?? result?.id;
    if (!upsert.ok || typeof contactId !== 'string' || !contactId) {
      console.error(`[consultation] GHL did not confirm the lead (HTTP ${upsert.status})`);
      return fail(502, `We couldn’t confirm your request. Please call ${PHONE} for help.`);
    }
    contactPath = `/contacts/${encodeURIComponent(contactId)}`;
    // Added on their own rather than in the upsert, so a returning contact
    // keeps the tags it already has. The workflow starts from this call, so a
    // contact without its tags is not a confirmed lead.
    const tagged = await post(`${contactPath}/tags`, {
      tags: ['beacon-blinds', lead.serviceTag, `sms-consent-${smsConsent ? 'yes' : 'no'}`, LEAD_TAG],
    });
    if (!tagged.ok) {
      console.error(`[consultation] GHL did not tag the lead (HTTP ${tagged.status})`);
      return fail(502, `We couldn’t confirm your request. Please call ${PHONE} for help.`);
    }
  } catch (error) {
    console.error(`[consultation] GHL request failed: ${error.name}`);
    return fail(502, `We couldn’t confirm your request. Please call ${PHONE} before submitting again.`);
  }

  // By now the lead is in GHL and its workflow has started. A missing note is
  // logged, not shown: the visitor would submit again, and the conversion
  // would never be reported for a real lead.
  try {
    const noted = await post(`${contactPath}/notes`, {
      body: [
        `Service type: ${lead.serviceType}`,
        `Customer message: ${lead.message}`,
        `SMS consent: ${smsConsent ? 'YES' : 'NO'}`,
        `Source page: ${lead.sourcePage}`,
        `Form: ${lead.formName}`,
        `Campaign: ${LEAD_TAG}`,
      ].join('\n'),
    });
    if (!noted.ok) console.error(`[consultation] GHL did not save the lead note (HTTP ${noted.status})`);
  } catch (error) {
    console.error(`[consultation] GHL lead note failed: ${error.name}`);
  }
  return {status: 200, body: {success: true}};
}
