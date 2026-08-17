import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export async function materializeGeneratedAtlas({ sourceDirectory, targetDirectory = sourceDirectory } = {}) {
  if (!sourceDirectory) throw new TypeError('sourceDirectory is required');

  const entries = await readdir(sourceDirectory);
  const partNames = entries
    .filter((name) => /^atlas\.b64\.\d+$/.test(name))
    .sort((left, right) => left.localeCompare(right, 'en', { numeric: true }));

  if (partNames.length === 0) throw new Error(`No generated atlas chunks found in ${sourceDirectory}`);

  const parts = await Promise.all(partNames.map((name) => readFile(path.join(sourceDirectory, name), 'utf8')));
  const encoded = parts.join('').replace(/\s+/g, '');
  const bytes = Buffer.from(encoded, 'base64');

  if (bytes.length < 8 || !bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error('Generated atlas chunks do not decode to a PNG');
  }

  await mkdir(targetDirectory, { recursive: true });
  const outputPath = path.join(targetDirectory, 'nostoryx-generated-atlas.png');
  await writeFile(outputPath, bytes);
  return { outputPath, bytes: bytes.length, parts: partNames.length };
}
