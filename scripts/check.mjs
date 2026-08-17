import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(target));
    else if (entry.name.endsWith('.js') || entry.name.endsWith('.mjs')) files.push(target);
  }
  return files;
}

const files = [
  ...await walk(path.join(process.cwd(), 'src')),
  ...await walk(path.join(process.cwd(), 'scripts')),
  ...await walk(path.join(process.cwd(), 'tests')),
];

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log(`Syntax check passed for ${files.length} JavaScript files.`);
