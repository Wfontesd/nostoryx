import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import process from 'node:process';
import { materializeGeneratedAtlas } from './generated-atlas.mjs';

const root = process.cwd();
const port = Number(process.env.PORT ?? 4173);
const generatedDirectory = path.join(root, 'public', 'generated');
const atlas = await materializeGeneratedAtlas({ sourceDirectory: generatedDirectory, targetDirectory: generatedDirectory });

const mime = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp'],
  ['.svg', 'image/svg+xml'],
]);

createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url ?? '/', `http://${req.headers.host}`).pathname);
  const requested = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const candidate = path.resolve(root, requested);
  const insideRoot = candidate === root || candidate.startsWith(`${root}${path.sep}`);
  const target = insideRoot && existsSync(candidate) && !statSync(candidate).isDirectory()
    ? candidate
    : path.join(root, 'index.html');

  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Type', mime.get(path.extname(target).toLowerCase()) ?? 'application/octet-stream');

  const stream = createReadStream(target);
  stream.on('error', (error) => {
    console.error('[NOSTORYX] Static server read failure', error);
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Internal server error');
  });
  stream.pipe(res);
}).listen(port, () => {
  console.log(`NOSTORYX Dev Labs: http://localhost:${port}`);
  console.log(`Generated atlas: ${atlas.frames} frames, ${atlas.bytes} bytes`);
});
