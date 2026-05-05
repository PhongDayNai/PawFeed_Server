import { readdir, readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const roots = ['src'];
const allowedExtensions = new Set(['.js', '.mjs']);
const findings = [];

async function collect(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await collect(full));
    else if (allowedExtensions.has(extname(entry.name))) files.push(full);
  }
  return files;
}

for (const root of roots) {
  for (const file of await collect(root)) {
    const text = await readFile(file, 'utf8');
    const lines = text.split('\n');
    lines.forEach((line, index) => {
      if (/console\.(log|error|warn)\s*\(\s*req\.body/.test(line)) {
        findings.push(`${file}:${index + 1} logs req.body directly`);
      }
      if (/console\.(log|error|warn).*password/i.test(line) && !/redact|MASK|safeErrorLog/.test(line)) {
        findings.push(`${file}:${index + 1} may log password-related data`);
      }
      if (/res\.json\([^\n]*(deviceSecret|mqttPassword|wifiPassword|pairingCode|claimCode)/.test(line)) {
        findings.push(`${file}:${index + 1} may return secret data directly`);
      }
    });
  }
}

if (findings.length) {
  console.error('Security scan found potential issues:');
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log('Security scan passed.');
