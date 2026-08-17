import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const port = Number(process.env.PORT ?? 4173);
const mime = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
]);

createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url ?? '/', `http://${req.headers.host}`).pathname);
  const requested = pathname === '/' ? '/index.html' : pathname;
  const safe = path.normalize(requested).replace(/^([.][.][/\\])+/, '');
  let target = path.join(root, safe);
  if (!target.startsWith(root) || !existsSync(target) || statSync(target).isDirectory()) target = path.join(root, 'index.html');

  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', mime.get(path.extname(target)) ?? 'application/octet-stream');
  createReadStream(target).pipe(res);
}).listen(port, () => {
  console.log(`NOSTORYX Dev Labs: http://localhost:${port}`);
});
