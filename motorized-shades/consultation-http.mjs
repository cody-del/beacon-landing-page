import {submitConsultation} from './consultation.mjs';

export function createConsultationHandler(submit = submitConsultation) {
  return async request => {
    const send = (status, body, headers = {}) => Response.json(body, {
      status, headers: {'Cache-Control': 'no-store', ...headers},
    });
    if (request.method !== 'POST') return send(405, {error: 'Method not allowed.'}, {Allow: 'POST'});
    if (request.headers.get('origin') !== new URL(request.url).origin) return send(403, {error: 'Invalid origin.'});
    if (!request.headers.get('content-type')?.startsWith('application/json')) return send(415, {error: 'Expected JSON.'});
    if (Number(request.headers.get('content-length')) > 8192) return send(413, {error: 'Request too large.'});
    let data;
    try {
      const reader = request.body?.getReader();
      if (!reader) return send(400, {error: 'Invalid request.'});
      const chunks = [];
      let size = 0;
      while (true) {
        const {done, value} = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 8192) {
          await reader.cancel();
          return send(413, {error: 'Request too large.'});
        }
        chunks.push(value);
      }
      data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      return send(400, {error: 'Invalid request.'});
    }
    const result = await submit(data);
    return send(result.status, result.body);
  };
}
