#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { __phase7Internals } from '../src/services/configFile.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const args = {
    fixture: 'fixtures/phase8/feeder001.config-fixture.json',
    out: 'tmp/phase8',
    secret: null,
    compact: false
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--fixture') args.fixture = argv[++index];
    else if (arg === '--out') args.out = argv[++index];
    else if (arg === '--secret') args.secret = argv[++index];
    else if (arg === '--compact') args.compact = true;
    else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function printHelp() {
  console.log(`Usage:
  node scripts/phase8.generate-sample-config.mjs [options]

Options:
  --fixture <path>  Fixture JSON containing { deviceSecret, config }.
                    Default: fixtures/phase8/feeder001.config-fixture.json
  --out <dir>       Output directory. Default: tmp/phase8
  --secret <value>  Override fixture.deviceSecret for signing.
  --compact         Write compact JSON for the no-extension config file.
  -h, --help        Show this help.

Outputs:
  <out>/<deviceId>                         Config file without extension for Machine upload
  <out>/<deviceId>.config.pretty.json      Human-readable signed config
  <out>/<deviceId>.signing-payload.txt     Exact server signing payload
  <out>/<deviceId>.expected-signature.txt  Expected HMAC-SHA256 signature
  <out>/<deviceId>.compatibility-report.json
`);
}

function resolveProjectPath(value) {
  return path.isAbsolute(value) ? value : path.join(projectRoot, value);
}

function assertConfigShape(fixture) {
  if (!fixture || typeof fixture !== 'object') throw new Error('Fixture must be a JSON object.');
  if (!fixture.config || typeof fixture.config !== 'object') throw new Error('Fixture must contain config object.');
  if (!fixture.deviceSecret && !process.argv.includes('--secret')) {
    throw new Error('Fixture must contain deviceSecret, or pass --secret.');
  }
  if (fixture.config.signature) {
    throw new Error('Fixture config must not contain signature. The script signs it.');
  }
  if (!fixture.config.deviceId) throw new Error('config.deviceId is required.');
  if (!fixture.config.feedingSchedule) throw new Error('config.feedingSchedule is required.');
}

function countLines(text) {
  if (!text) return 0;
  return text.split('\n').length;
}

async function main() {
  const args = parseArgs(process.argv);
  const fixturePath = resolveProjectPath(args.fixture);
  const outDir = resolveProjectPath(args.out);

  const fixture = JSON.parse(await fs.readFile(fixturePath, 'utf8'));
  assertConfigShape(fixture);

  const deviceSecret = args.secret ?? fixture.deviceSecret;
  const unsignedConfig = structuredClone(fixture.config);
  const signingPayload = __phase7Internals.buildSigningPayloadV3(unsignedConfig);
  const signature = __phase7Internals.signConfigPayload(signingPayload, deviceSecret);
  const signedConfig = { ...unsignedConfig, signature };

  const deviceId = signedConfig.deviceId;
  const configContent = JSON.stringify(signedConfig, null, args.compact ? 0 : 2);
  const prettyContent = JSON.stringify(signedConfig, null, 2);
  const signatureFileContent = `${signature}\n`;
  const report = {
    ok: true,
    fixture: path.relative(projectRoot, fixturePath),
    generatedAt: new Date().toISOString(),
    deviceId,
    machineCode: signedConfig.machineCode,
    configId: signedConfig.configId,
    configVersion: signedConfig.configVersion,
    fileNameWithoutExtension: deviceId,
    signature,
    signingPayloadLineCount: countLines(signingPayload),
    signingPayloadByteLength: Buffer.byteLength(signingPayload, 'utf8'),
    configByteLength: Buffer.byteLength(configContent, 'utf8'),
    hasTrailingNewlineInPayload: signingPayload.endsWith('\n'),
    checks: {
      signatureFieldExcludedFromPayload: !signingPayload.includes('signature='),
      booleanLowercase: /mqttUseTls=(true|false)/.test(signingPayload) && /keepSetupApEnabled=(true|false)/.test(signingPayload),
      scheduleCountPresent: signingPayload.includes(`schedule.count=${signedConfig.feedingSchedule.items.length}`),
      providerFieldsPresent: [
        'provider.name=',
        'provider.brand=',
        'provider.website=',
        'provider.contact=',
        'provider.note='
      ].every((line) => signingPayload.includes(line))
    },
    files: {
      machineUploadFile: path.join(args.out, deviceId),
      prettyConfig: path.join(args.out, `${deviceId}.config.pretty.json`),
      signingPayload: path.join(args.out, `${deviceId}.signing-payload.txt`),
      expectedSignature: path.join(args.out, `${deviceId}.expected-signature.txt`),
      report: path.join(args.out, `${deviceId}.compatibility-report.json`)
    }
  };

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, deviceId), configContent, 'utf8');
  await fs.writeFile(path.join(outDir, `${deviceId}.config.pretty.json`), `${prettyContent}\n`, 'utf8');
  await fs.writeFile(path.join(outDir, `${deviceId}.signing-payload.txt`), signingPayload, 'utf8');
  await fs.writeFile(path.join(outDir, `${deviceId}.expected-signature.txt`), signatureFileContent, 'utf8');
  await fs.writeFile(path.join(outDir, `${deviceId}.compatibility-report.json`), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(`Phase 8 sample config generated for ${deviceId}.`);
  console.log(`Upload file: ${path.relative(projectRoot, path.join(outDir, deviceId))}`);
  console.log(`Signing payload: ${path.relative(projectRoot, path.join(outDir, `${deviceId}.signing-payload.txt`))}`);
  console.log(`Expected signature: ${signature}`);
}

main().catch((error) => {
  console.error(`Phase 8 sample generation failed: ${error.message}`);
  process.exit(1);
});
