import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const dist = path.join(root, 'dist');

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const entry of ['index.html', 'src', 'public']) {
  await cp(path.join(root, entry), path.join(dist, entry), { recursive: true });
}

await writeFile(path.join(dist, '.nojekyll'), '');
await writeFile(
  path.join(dist, 'build-info.json'),
  JSON.stringify({
    build: process.env.GITHUB_SHA ?? 'local',
    ref: process.env.GITHUB_REF_NAME ?? 'local',
    builtAt: new Date().toISOString(),
  }, null, 2),
);

console.log(`Built static Dev Labs to ${path.relative(root, dist)}/`);
