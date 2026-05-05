#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

function printHelp() {
  console.log(`Usage:
  node scripts/phase8.compare-payload.mjs <server-payload.txt> <machine-payload.txt> [--json <report.json>]

Purpose:
  Compare the exact Server signing payload with the payload printed by Machine firmware.
  Use this when Machine preview returns invalid_signature.

Exit code:
  0 = payloads match exactly
  1 = payloads differ
`);
}

function parseArgs(argv) {
  const positional = [];
  const args = { json: null };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--json') args.json = argv[++index];
    else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else positional.push(arg);
  }

  if (positional.length !== 2) {
    printHelp();
    process.exit(2);
  }

  args.serverPayloadPath = positional[0];
  args.machinePayloadPath = positional[1];
  return args;
}

function normalizeLineEndings(value) {
  return value.replace(/\r\n/g, '\n');
}

function splitLines(value) {
  return normalizeLineEndings(value).split('\n');
}

function hasTrailingNewline(value) {
  return value.endsWith('\n') || value.endsWith('\r\n');
}

function findLineDiffs(serverText, machineText, maxDiffs = 20) {
  const serverLines = splitLines(serverText);
  const machineLines = splitLines(machineText);
  const max = Math.max(serverLines.length, machineLines.length);
  const diffs = [];

  for (let index = 0; index < max; index += 1) {
    const serverLine = serverLines[index];
    const machineLine = machineLines[index];
    if (serverLine !== machineLine) {
      diffs.push({
        line: index + 1,
        server: serverLine ?? '<missing>',
        machine: machineLine ?? '<missing>'
      });
      if (diffs.length >= maxDiffs) break;
    }
  }

  return {
    serverLineCount: serverLines.length,
    machineLineCount: machineLines.length,
    diffs
  };
}

function buildHints(report) {
  const hints = [];

  if (report.trailingNewline.server !== report.trailingNewline.machine) {
    hints.push('Trailing newline khác nhau. Kiểm tra Machine có thêm/bớt newline cuối payload không.');
  }

  if (report.normalizedLineEndingsMatch && !report.exactMatch) {
    hints.push('Nội dung khớp sau khi normalize CRLF/LF. Kiểm tra line ending giữa Server và Machine.');
  }

  const firstDiff = report.lineDiffs.diffs[0];
  if (firstDiff) {
    const combined = `${firstDiff.server}\n${firstDiff.machine}`;
    if (/true|false|True|False|TRUE|FALSE/.test(combined)) {
      hints.push('Có khác biệt boolean. Machine phải dùng true/false lowercase.');
    }
    if (/schedule\.count|schedule\.\d+\./.test(combined)) {
      hints.push('Có khác biệt schedule. Kiểm tra schedule.count, thứ tự item, id/time/openDurationMs/enabled.');
    }
    if (/provider\./.test(combined)) {
      hints.push('Có khác biệt provider. Thiếu field provider vẫn phải dùng chuỗi rỗng, không bỏ dòng.');
    }
    if (/wifiPass|mqttPass/.test(combined)) {
      hints.push('Có khác biệt secret trong payload. Kiểm tra Wi-Fi/MQTT password đúng với file config.');
    }
  }

  if (!hints.length && !report.exactMatch) {
    hints.push('Payload khác nhau. So sánh từng dòng đầu tiên trong report để chỉnh Machine hoặc Server.');
  }

  return hints;
}

async function main() {
  const args = parseArgs(process.argv);
  const serverText = await fs.readFile(args.serverPayloadPath, 'utf8');
  const machineText = await fs.readFile(args.machinePayloadPath, 'utf8');

  const report = {
    ok: serverText === machineText,
    exactMatch: serverText === machineText,
    normalizedLineEndingsMatch: normalizeLineEndings(serverText) === normalizeLineEndings(machineText),
    serverPayloadPath: args.serverPayloadPath,
    machinePayloadPath: args.machinePayloadPath,
    byteLength: {
      server: Buffer.byteLength(serverText, 'utf8'),
      machine: Buffer.byteLength(machineText, 'utf8')
    },
    trailingNewline: {
      server: hasTrailingNewline(serverText),
      machine: hasTrailingNewline(machineText)
    },
    lineDiffs: findLineDiffs(serverText, machineText)
  };
  report.hints = buildHints(report);

  if (args.json) {
    await fs.mkdir(path.dirname(args.json), { recursive: true });
    await fs.writeFile(args.json, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }

  if (report.ok) {
    console.log('Payloads match exactly. HMAC mismatch is likely caused by a different deviceSecret.');
    process.exit(0);
  }

  console.error('Payloads do not match. First differences:');
  for (const diff of report.lineDiffs.diffs.slice(0, 10)) {
    console.error(`Line ${diff.line}`);
    console.error(`  server : ${diff.server}`);
    console.error(`  machine: ${diff.machine}`);
  }
  if (report.hints.length) {
    console.error('\nHints:');
    for (const hint of report.hints) console.error(`- ${hint}`);
  }
  process.exit(1);
}

main().catch((error) => {
  console.error(`Phase 8 payload compare failed: ${error.message}`);
  process.exit(2);
});
