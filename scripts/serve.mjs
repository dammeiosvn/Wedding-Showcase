import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
const root = path.resolve('dist');
const prefix = '/Wedding-Showcase/';
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4' };
http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname === '/' || url.pathname === prefix.slice(0, -1)) { response.writeHead(302, { Location: prefix }); response.end(); return; }
    if (!url.pathname.startsWith(prefix)) throw new Error('Not found');
    const relative = decodeURIComponent(url.pathname.slice(prefix.length)) || 'index.html';
    const filename = path.resolve(root, relative);
    if (!filename.startsWith(root + path.sep)) throw new Error('Invalid path');
    const data = await fs.readFile(filename);
    response.writeHead(200, { 'Content-Type': types[path.extname(filename)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); response.end(data);
  } catch { response.writeHead(404); response.end('Not found'); }
}).listen(Number(process.env.PORT || 4173), '0.0.0.0', () => console.log('Preview: http://localhost:4173/Wedding-Showcase/'));
