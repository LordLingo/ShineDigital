'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
for (const file of ['index.html', 'studio.css', 'studio.js', 'shared.js']) {
  fs.mkdirSync(path.join(root, 'public/studio'), { recursive: true });
  fs.copyFileSync(path.join(root, 'studio-source', file), path.join(root, 'public/studio', file));
}
for (const file of ['preview.html', 'preview.css', 'preview.js']) {
  fs.mkdirSync(path.join(root, 'public/preview'), { recursive: true });
  fs.copyFileSync(path.join(root, 'studio-source', file), path.join(root, 'public/preview', file === 'preview.html' ? 'index.html' : file));
}
console.log('Built Shine Studio and the preview viewer.');
