#!/usr/bin/env node
/**
 * Validates openapi.yaml exists and is structurally valid.
 * Runs swagger-cli validate as the primary check.
 */
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

async function validateOpenApi() {
  // Check file exists
  await readFile('./openapi.yaml', 'utf8');

  // Run swagger-cli validate
  const { stdout, stderr } = await execFileAsync('npx', [
    '--yes',
    '@apidevtools/swagger-cli',
    'validate',
    'openapi.yaml'
  ]);

  const output = stdout + stderr;
  if (output.includes('is valid')) {
    console.log('✅ openapi.yaml is valid');
  } else {
    throw new Error(output || 'Unknown validation error');
  }
}

async function main() {
  console.log('Validating openapi.yaml...\n');
  try {
    await validateOpenApi();
    console.log('\n✅ Validation passed.');
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }
}

main();
