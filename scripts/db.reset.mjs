import { env } from '../src/config/env.js';
import { requireDevResetAllowed, getDbConfig, logDbTarget } from './db/common.mjs';
import mysql from 'mysql2/promise';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const force = process.argv.includes('--force');
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function runNodeScript(scriptName) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(projectRoot, 'scripts', scriptName)], {
      stdio: 'inherit',
      env: process.env
    });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${scriptName} exited with code ${code}`));
    });
  });
}

async function main() {
  if (!force) {
    throw new Error('Use: npm run db:reset -- --force');
  }

  requireDevResetAllowed();
  logDbTarget();

  const connection = await mysql.createConnection(getDbConfig({ withDatabase: false }));
  try {
    console.log(`[reset] dropping database ${env.db.database}`);
    await connection.query(`DROP DATABASE IF EXISTS \`${env.db.database}\``);
  } finally {
    await connection.end();
  }

  await runNodeScript('db.migrate.mjs');
  await runNodeScript('db.seed.mjs');
  console.log('[reset] done.');
}

main().catch((error) => {
  console.error('[reset] failed:', error.message);
  process.exit(1);
});
