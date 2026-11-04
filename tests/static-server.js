/*
 * Tiny static file server for testing public/ locally.
 * Behaves like the Vercel setup in vercel.json: "/" and "/en/" serve index.html,
 * unknown paths return 404.html with status 404.
 *
 *   const { start } = require('./static-server');
 *   const srv = await start(path.join(__dirname, '..', 'public'));   // srv.url, srv.close()
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml', '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json'
};

function start(root, port) {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    let file = path.join(root, p);
    if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file) && !path.extname(file) && fs.existsSync(path.join(file, 'index.html'))) file = path.join(file, 'index.html');
    let status = 200;
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { file = path.join(root, '404.html'); status = 404; }
    res.writeHead(status, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(port || 0, '127.0.0.1', () => {
      resolve({ url: 'http://127.0.0.1:' + server.address().port, close: () => new Promise((r) => server.close(r)) });
    });
  });
}

module.exports = { start };

if (require.main === module) {
  start(path.join(__dirname, '..', 'public'), Number(process.argv[2]) || 4173).then((s) => console.log('Serving public/ at ' + s.url));
}
