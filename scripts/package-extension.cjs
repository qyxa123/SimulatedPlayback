#!/usr/bin/env node
'use strict';

// A deterministic ZIP with only runtime files. No npm dependency or system zip
// program is required. Fixed timestamps and order make repeated builds identical.
const fs = require('node:fs');
const path = require('node:path');
const { deflateRawSync } = require('node:zlib');

const root = path.resolve(__dirname, '..');
const extension = path.join(root, 'web-extension');
const files = [
  'content.js',
  'manifest.json',
  'popup.html',
  'popup.js',
  'src/sim.js',
  'style.css',
];
const manifest = JSON.parse(fs.readFileSync(path.join(extension, 'manifest.json'), 'utf8'));
const referenced = [
  manifest.action?.default_popup,
  manifest.background?.service_worker,
  ...Object.values(manifest.icons || {}),
  ...(manifest.content_scripts || []).flatMap(script => [...(script.js || []), ...(script.css || [])]),
].filter(Boolean);
for (const file of referenced) {
  if (!files.includes(file)) throw new Error(`Manifest references an unpackaged file: ${file}`);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const chunks = [];
const directory = [];
let offset = 0;
for (const file of files) {
  const name = Buffer.from(file, 'utf8');
  const data = fs.readFileSync(path.join(extension, file));
  const compressed = deflateRawSync(data, { level: 9 });
  const crc = crc32(data);
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4); // ZIP 2.0
  header.writeUInt16LE(8, 8); // DEFLATE
  header.writeUInt16LE(33, 12); // 1980-01-01, 00:00:00
  header.writeUInt32LE(crc, 14);
  header.writeUInt32LE(compressed.length, 18);
  header.writeUInt32LE(data.length, 22);
  header.writeUInt16LE(name.length, 26);
  chunks.push(header, name, compressed);

  const entry = Buffer.alloc(46);
  entry.writeUInt32LE(0x02014b50, 0);
  entry.writeUInt16LE(0x0314, 4); // Unix, ZIP 2.0
  entry.writeUInt16LE(20, 6);
  entry.writeUInt16LE(8, 10);
  entry.writeUInt16LE(33, 14);
  entry.writeUInt32LE(crc, 16);
  entry.writeUInt32LE(compressed.length, 20);
  entry.writeUInt32LE(data.length, 24);
  entry.writeUInt16LE(name.length, 28);
  entry.writeUInt32LE((0o100644 << 16) >>> 0, 38);
  entry.writeUInt32LE(offset, 42);
  directory.push(entry, name);
  offset += header.length + name.length + compressed.length;
}

const central = Buffer.concat(directory);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(files.length, 8);
end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(central.length, 12);
end.writeUInt32LE(offset, 16);
const output = path.join(root, 'dist', 'web-extension.zip');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, Buffer.concat([...chunks, central, end]));
console.log(`Packaged SimPlay ${manifest.version}: ${path.relative(root, output)} (${files.length} files)`);
