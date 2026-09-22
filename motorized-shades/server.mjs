import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {submitConsultation} from './consultation.mjs';

const root = fileURLToPath(new URL('./dist/', import.meta.url));
const port = 4318;
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.ttf':'font/ttf'};
http.createServer(async (req, res) => {
  const send = (status, body) => {
    res.writeHead(status, {'Content-Type':'application/json','Cache-Control':'no-store'});
    res.end(JSON.stringify(body));
  };
  try {
    const path = new URL(req.url, `http://127.0.0.1:${port}`).pathname;
    if (path === '/api/consultation') {
      if (req.method !== 'POST') return send(405, {error:'Method not allowed.'});
      if (![`http://127.0.0.1:${port}`,`http://localhost:${port}`].includes(req.headers.origin)) return send(403, {error:'Invalid origin.'});
      if (!req.headers['content-type']?.startsWith('application/json')) return send(415, {error:'Expected JSON.'});
      const chunks = []; let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 8192) return send(413, {error:'Request too large.'});
        chunks.push(chunk);
      }
      let data;
      try { data = JSON.parse(Buffer.concat(chunks).toString()); }
      catch { return send(400, {error:'Invalid request.'}); }
      const result = await submitConsultation(data);
      return send(result.status, result.body);
    }
    if (!['GET','HEAD'].includes(req.method)) return send(405, {error:'Method not allowed.'});
    const file = resolve(root, '.' + decodeURIComponent(path.endsWith('/') ? path + 'index.html' : path));
    if (!file.startsWith(resolve(root) + sep)) return send(403, {error:'Not allowed.'});
    const content = await readFile(file);
    res.writeHead(200, {'Content-Type':types[extname(file)] || 'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch { send(404, {error:'Not found.'}); }
}).listen(port, '127.0.0.1', () => console.log(`Beacon Blinds preview: http://127.0.0.1:${port}/`));
