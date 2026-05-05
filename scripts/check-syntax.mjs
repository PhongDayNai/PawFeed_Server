import { readdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { spawnSync } from 'node:child_process';

const roots = ['src', 'scripts'];
const allowedExtensions = new Set(['.js', '.mjs']);

async function collectFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(fullPath));
    } else if (allowedExtensions.has(extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

const files = [];
for (const root of roots) {
  files.push(...await collectFiles(root));
}

for (const file of files.sort()) {
  const result = spawnSync(process.execPath, ['--check', file], {
    stdio: 'inherit'
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log(`Syntax check passed for ${files.length} files.`);
