import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function toPhaserAtlas(metadata) {
  const frames = Object.fromEntries(Object.entries(metadata.frames ?? {}).map(([name, frame]) => [name, {
    frame: { x: frame.x, y: frame.y, w: frame.w, h: frame.h },
    rotated: false,
    trimmed: false,
    spriteSourceSize: { x: 0, y: 0, w: frame.w, h: frame.h },
    sourceSize: { w: frame.w, h: frame.h },
  }]));

  return {
    frames,
    meta: {
      app: 'NOSTORYX generated art pipeline',
      version: '1.0',
      image: 'nostoryx-generated-atlas.png',
      format: 'RGBA8888',
      size: { w: metadata.width, h: metadata.height },
      scale: '1',
    },
  };
}

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

  const metadata = JSON.parse(await readFile(path.join(sourceDirectory, 'nostoryx-generated-atlas.json'), 'utf8'));
  const atlas = toPhaserAtlas(metadata);

  await mkdir(targetDirectory, { recursive: true });
  const imagePath = path.join(targetDirectory, 'nostoryx-generated-atlas.png');
  const dataPath = path.join(targetDirectory, 'nostoryx-generated-atlas.phaser.json');
  await Promise.all([
    writeFile(imagePath, bytes),
    writeFile(dataPath, JSON.stringify(atlas)),
  ]);

  return { imagePath, dataPath, bytes: bytes.length, parts: partNames.length, frames: Object.keys(atlas.frames).length };
}
