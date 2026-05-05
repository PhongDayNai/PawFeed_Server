import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const OUTPUT_JSON = 'tmp/phase21/spec-compliance-report.json';
const OUTPUT_MD = 'tmp/phase21/spec-compliance-report.md';

async function read(path) {
  return readFile(path, 'utf8');
}

async function readMany(paths) {
  const entries = await Promise.all(paths.map(async (path) => [path, await read(path)]));
  return Object.fromEntries(entries);
}

function normalize(text) {
  return String(text).replace(/\s+/g, ' ').toLowerCase();
}

function hasAll(text, snippets) {
  const source = normalize(text);
  return snippets.every((snippet) => source.includes(normalize(snippet)));
}

function pushCheck(checks, { category, id, label, status, evidence = [], notes = '' }) {
  checks.push({
    category,
    id,
    label,
    status,
    evidence,
    notes
  });
}

function checkSnippets(checks, allFiles, { category, id, label, files, snippets, notes }) {
  const combined = files.map((file) => allFiles[file] ?? '').join('\n');
  const passed = hasAll(combined, snippets);
  pushCheck(checks, {
    category,
    id,
    label,
    status: passed ? 'pass' : 'fail',
    evidence: files,
    notes: passed ? notes || '' : `Missing one or more snippets: ${snippets.join(', ')}`
  });
}

function checkAnySnippet(checks, allFiles, { category, id, label, files, snippets, notes }) {
  const combined = files.map((file) => allFiles[file] ?? '').join('\n');
  const source = normalize(combined);
  const passed = snippets.some((snippet) => source.includes(normalize(snippet)));
  pushCheck(checks, {
    category,
    id,
    label,
    status: passed ? 'pass' : 'fail',
    evidence: files,
    notes: passed ? notes || '' : `Missing any of: ${snippets.join(', ')}`
  });
}

function tableExists(migrationsText, tableName) {
  return normalize(migrationsText).includes(`create table if not exists ${tableName.toLowerCase()}`)
    || normalize(migrationsText).includes(`create table ${tableName.toLowerCase()}`);
}

const requiredFiles = [
  'package.json',
  'README.md',
  'deploy/docker-compose.dev.yml',
  'src/app.js',
  'src/routes/auth.routes.js',
  'src/routes/account.routes.js',
  'src/routes/dashboard.routes.js',
  'src/routes/device.routes.js',
  'src/routes/admin.routes.js',
  'src/controllers/configFile.controller.js',
  'src/validators/configFile.validator.js',
  'src/services/configFile.service.js',
  'src/services/mqttInbound.service.js',
  'src/mqtt/mqttClient.js',
  'src/mqtt/mqttPublisher.js',
  'src/mqtt/mqttRouter.js',
  'src/services/currentConfig.service.js',
  'src/services/device.service.js',
  'src/services/command.service.js',
  'src/services/audit.service.js',
  'src/services/adminMqtt.service.js',
  'src/services/systemSettings.service.js',
  'src/middleware/rateLimits.js',
  'src/middleware/security.js',
  'src/utils/redact.js',
  'src/workers/commandTimeout.worker.js',
  'src/workers/deviceOffline.worker.js',
  'sql/migrations/001_create_users.sql',
  'sql/migrations/002_create_devices.sql',
  'sql/migrations/003_create_mqtt.sql',
  'sql/migrations/004_create_current_configs.sql',
  'sql/migrations/005_create_schedules.sql',
  'sql/migrations/006_create_config_generations.sql',
  'sql/migrations/007_create_commands_events_histories.sql',
  'sql/migrations/008_create_system_settings.sql',
  'sql/migrations/009_create_audit_logs.sql',
  'sql/migrations/010_add_device_display_name.sql',
  'sql/migrations/011_add_audit_log_phase18_fields.sql'
];

const allFiles = await readMany(requiredFiles);
const checks = [];
const migrationFiles = Object.keys(allFiles).filter((file) => file.startsWith('sql/migrations/'));
const migrationsText = migrationFiles.map((file) => allFiles[file]).join('\n');

const dbTables = [
  'users',
  'devices',
  'device_link_histories',
  'mqtt_servers',
  'device_mqtt_credentials',
  'device_current_configs',
  'device_config_generations',
  'feeding_schedules',
  'feeding_schedule_items',
  'device_latest_status',
  'device_events',
  'device_commands',
  'feeding_histories',
  'system_settings',
  'audit_logs'
];

for (const table of dbTables) {
  pushCheck(checks, {
    category: 'database',
    id: `db.${table}`,
    label: `Database table: ${table}`,
    status: tableExists(migrationsText, table) ? 'pass' : 'fail',
    evidence: migrationFiles.filter((file) => normalize(allFiles[file]).includes(table)),
    notes: tableExists(migrationsText, table) ? '' : `Missing CREATE TABLE for ${table}`
  });
}

checkSnippets(checks, allFiles, {
  category: 'database',
  id: 'db.devices.versioning-and-pairing',
  label: 'Devices include pairing, active config, status and owner fields',
  files: ['sql/migrations/002_create_devices.sql'],
  snippets: ['claim_code', 'claim_code_used_at', 'claim_code_rotated_at', 'owner_user_id', 'active_config_id', 'active_config_version']
});

checkSnippets(checks, allFiles, {
  category: 'database',
  id: 'db.current-config.latest-config',
  label: 'Current config tracks latest config and local setup fields',
  files: ['sql/migrations/004_create_current_configs.sql'],
  snippets: ['wifi_ssid', 'wifi_password', 'address', 'address_note', 'keep_setup_ap_enabled', 'latest_config_id', 'latest_config_version']
});

checkSnippets(checks, allFiles, {
  category: 'database',
  id: 'db.config-generations.v3-fields',
  label: 'Config generation table tracks v3 metadata',
  files: ['sql/migrations/006_create_config_generations.sql'],
  snippets: ['config_id', 'config_version', 'config_schema_version', 'mqtt_use_tls', 'mqtt_port', 'keep_setup_ap_enabled', 'schedule_item_count', 'signature_hash']
});

const routeChecks = [
  ['user.dashboard', 'GET /api/dashboard', 'src/routes/dashboard.routes.js', ["router.get('/dashboard'"]],
  ['auth.register', 'POST /api/auth/register', 'src/routes/auth.routes.js', ["router.post('/auth/register'"]],
  ['auth.login', 'POST /api/auth/login', 'src/routes/auth.routes.js', ["router.post('/auth/login'"]],
  ['auth.refresh', 'POST /api/auth/refresh', 'src/routes/auth.routes.js', ["router.post('/auth/refresh'"]],
  ['auth.me', 'GET /api/auth/me', 'src/routes/auth.routes.js', ["router.get('/auth/me'"]],
  ['account.profile', 'PATCH /api/account/profile', 'src/routes/account.routes.js', ["router.patch('/account/profile'"]],
  ['user.devices.list', 'GET /api/devices', 'src/routes/device.routes.js', ["router.get('/devices'"]],
  ['user.devices.link', 'POST /api/devices/link', 'src/routes/device.routes.js', ["router.post('/devices/link'"]],
  ['user.device.status', 'GET /api/devices/:deviceId/status', 'src/routes/device.routes.js', ["/devices/:deviceId/status"]],
  ['user.device.detail', 'GET /api/devices/:deviceId', 'src/routes/device.routes.js', ["router.get('/devices/:deviceId'"]],
  ['user.device.rename', 'PATCH /api/devices/:deviceId', 'src/routes/device.routes.js', ["router.patch(", "'/devices/:deviceId'"]],
  ['user.device.unlink', 'POST /api/devices/:deviceId/unlink', 'src/routes/device.routes.js', ["/devices/:deviceId/unlink"]],
  ['user.current-config.get', 'GET /api/devices/:deviceId/current-config', 'src/routes/device.routes.js', ["/devices/:deviceId/current-config"]],
  ['user.current-config.put', 'PUT /api/devices/:deviceId/current-config', 'src/routes/device.routes.js', ["router.put(", "'/devices/:deviceId/current-config'"]],
  ['user.schedule.get', 'GET /api/devices/:deviceId/schedule', 'src/routes/device.routes.js', ["router.get('/devices/:deviceId/schedule'"]],
  ['user.schedule.put', 'PUT /api/devices/:deviceId/schedule', 'src/routes/device.routes.js', ["router.put(", "'/devices/:deviceId/schedule'"]],
  ['user.schedule.apply-status', 'GET /api/devices/:deviceId/schedule/apply-status', 'src/routes/device.routes.js', ["/devices/:deviceId/schedule/apply-status"]],
  ['user.config-file.create', 'POST /api/devices/:deviceId/config-file', 'src/routes/device.routes.js', ["/devices/:deviceId/config-file"]],
  ['user.config-file.regenerate', 'POST /api/devices/:deviceId/config-file/regenerate', 'src/routes/device.routes.js', ["/devices/:deviceId/config-file/regenerate"]],
  ['user.commands.feed-now', 'POST /api/devices/:deviceId/commands/feed-now', 'src/routes/device.routes.js', ["/devices/:deviceId/commands/feed-now"]],
  ['user.commands.list', 'GET /api/devices/:deviceId/commands', 'src/routes/device.routes.js', ["/devices/:deviceId/commands"]],
  ['user.commands.status', 'GET /api/devices/:deviceId/commands/:requestId', 'src/routes/device.routes.js', ["/devices/:deviceId/commands/:requestId"]],
  ['user.events.list', 'GET /api/devices/:deviceId/events', 'src/routes/device.routes.js', ["/devices/:deviceId/events"]],
  ['user.feeding-history.list', 'GET /api/devices/:deviceId/feeding-history', 'src/routes/device.routes.js', ["/devices/:deviceId/feeding-history"]],
  ['user.config-generations.list', 'GET /api/devices/:deviceId/config-generations', 'src/routes/device.routes.js', ["/devices/:deviceId/config-generations"]],
  ['admin.dashboard', 'GET /api/admin/dashboard', 'src/routes/admin.routes.js', ["/admin/dashboard"]],
  ['admin.users.list', 'GET /api/admin/users', 'src/routes/admin.routes.js', ["/admin/users"]],
  ['admin.users.detail', 'GET /api/admin/users/:userId', 'src/routes/admin.routes.js', ["/admin/users/:userId"]],
  ['admin.users.update', 'PATCH /api/admin/users/:userId', 'src/routes/admin.routes.js', ["router.patch('/admin/users/:userId'"]],
  ['admin.users.disable', 'POST /api/admin/users/:userId/disable', 'src/routes/admin.routes.js', ["/admin/users/:userId/disable"]],
  ['admin.users.enable', 'POST /api/admin/users/:userId/enable', 'src/routes/admin.routes.js', ["/admin/users/:userId/enable"]],
  ['admin.devices.create', 'POST /api/admin/devices', 'src/routes/admin.routes.js', ["router.post('/admin/devices'"]],
  ['admin.devices.list', 'GET /api/admin/devices', 'src/routes/admin.routes.js', ["router.get('/admin/devices'"]],
  ['admin.devices.detail', 'GET /api/admin/devices/:deviceId', 'src/routes/admin.routes.js', ["/admin/devices/:deviceId"]],
  ['admin.devices.update', 'PATCH /api/admin/devices/:deviceId', 'src/routes/admin.routes.js', ["router.patch('/admin/devices/:deviceId'"]],
  ['admin.devices.disable', 'POST /api/admin/devices/:deviceId/disable', 'src/routes/admin.routes.js', ["/admin/devices/:deviceId/disable"]],
  ['admin.devices.enable', 'POST /api/admin/devices/:deviceId/enable', 'src/routes/admin.routes.js', ["/admin/devices/:deviceId/enable"]],
  ['admin.devices.revoke', 'POST /api/admin/devices/:deviceId/revoke', 'src/routes/admin.routes.js', ["/admin/devices/:deviceId/revoke"]],
  ['admin.devices.unlink', 'POST /api/admin/devices/:deviceId/unlink', 'src/routes/admin.routes.js', ["/admin/devices/:deviceId/unlink"]],
  ['admin.devices.transfer-owner', 'POST /api/admin/devices/:deviceId/transfer-owner', 'src/routes/admin.routes.js', ["/admin/devices/:deviceId/transfer-owner"]],
  ['admin.devices.qr', 'GET /api/admin/devices/:deviceId/qr', 'src/routes/admin.routes.js', ["/admin/devices/:deviceId/qr"]],
  ['admin.devices.pairing-status', 'GET /api/admin/devices/:deviceId/pairing-code/status', 'src/routes/admin.routes.js', ["/admin/devices/:deviceId/pairing-code/status"]],
  ['admin.devices.rotate-pairing', 'POST /api/admin/devices/:deviceId/rotate-pairing-code', 'src/routes/admin.routes.js', ["/admin/devices/:deviceId/rotate-pairing-code"]],
  ['admin.devices.link-attempts', 'GET /api/admin/devices/:deviceId/link-attempts', 'src/routes/admin.routes.js', ["/admin/devices/:deviceId/link-attempts"]],
  ['admin.mqtt-servers.list', 'GET /api/admin/mqtt-servers', 'src/routes/admin.routes.js', ["/admin/mqtt-servers"]],
  ['admin.mqtt-servers.create', 'POST /api/admin/mqtt-servers', 'src/routes/admin.routes.js', ["router.post('/admin/mqtt-servers'"]],
  ['admin.mqtt-servers.detail', 'GET /api/admin/mqtt-servers/:id', 'src/routes/admin.routes.js', ["/admin/mqtt-servers/:id"]],
  ['admin.mqtt-servers.update', 'PATCH /api/admin/mqtt-servers/:id', 'src/routes/admin.routes.js', ["router.patch('/admin/mqtt-servers/:id'"]],
  ['admin.mqtt-servers.test', 'POST /api/admin/mqtt-servers/:id/test', 'src/routes/admin.routes.js', ["/admin/mqtt-servers/:id/test"]],
  ['admin.mqtt-credential.metadata', 'GET /api/admin/devices/:deviceId/mqtt-credential', 'src/routes/admin.routes.js', ["/admin/devices/:deviceId/mqtt-credential"]],
  ['admin.mqtt-credentials.list', 'GET /api/admin/devices/:deviceId/mqtt-credentials', 'src/routes/admin.routes.js', ["/admin/devices/:deviceId/mqtt-credentials"]],
  ['admin.mqtt-credential.rotate', 'POST /api/admin/devices/:deviceId/rotate-mqtt-credential', 'src/routes/admin.routes.js', ["/admin/devices/:deviceId/rotate-mqtt-credential"]],
  ['admin.device-secret.rotate', 'POST /api/admin/devices/:deviceId/rotate-device-secret', 'src/routes/admin.routes.js', ["/admin/devices/:deviceId/rotate-device-secret"]],
  ['admin.device-events', 'GET /api/admin/device-events', 'src/routes/admin.routes.js', ["/admin/device-events"]],
  ['admin.device-commands', 'GET /api/admin/device-commands', 'src/routes/admin.routes.js', ["/admin/device-commands"]],
  ['admin.feeding-histories', 'GET /api/admin/feeding-histories', 'src/routes/admin.routes.js', ["/admin/feeding-histories"]],
  ['admin.config-generations.list', 'GET /api/admin/config-generations', 'src/routes/admin.routes.js', ["/admin/config-generations"]],
  ['admin.config-generations.detail', 'GET /api/admin/config-generations/:configId', 'src/routes/admin.routes.js', ["/admin/config-generations/:configId"]],
  ['admin.config-generations.revoke', 'POST /api/admin/config-generations/:configId/revoke', 'src/routes/admin.routes.js', ["/admin/config-generations/:configId/revoke"]],
  ['admin.system-settings.get', 'GET /api/admin/system-settings', 'src/routes/admin.routes.js', ["/admin/system-settings"]],
  ['admin.system-settings.patch', 'PATCH /api/admin/system-settings', 'src/routes/admin.routes.js', ["router.patch('/admin/system-settings'"]],
  ['admin.audit-logs', 'GET /api/admin/audit-logs', 'src/routes/admin.routes.js', ["/admin/audit-logs"]],
  ['admin.audit-logs.export', 'GET /api/admin/audit-logs/export', 'src/routes/admin.routes.js', ["/admin/audit-logs/export"]]
];

for (const [id, label, file, snippets] of routeChecks) {
  checkSnippets(checks, allFiles, {
    category: id.startsWith('admin.') ? 'admin-api' : id.startsWith('auth.') || id.startsWith('account.') ? 'auth-account-api' : 'user-api',
    id,
    label,
    files: [file],
    snippets
  });
}

const configFiles = ['src/services/configFile.service.js', 'src/controllers/configFile.controller.js', 'src/validators/configFile.validator.js'];
checkSnippets(checks, allFiles, {
  category: 'config-v3',
  id: 'config.schema-v3-fields',
  label: 'Config file v3 contains required fields',
  files: ['src/services/configFile.service.js'],
  snippets: [
    'CONFIG_SCHEMA_VERSION = 3',
    'configId',
    'configVersion',
    'issuedAt',
    'expiresAt',
    'machineCode',
    'deviceId',
    'wifiSsid',
    'wifiPass',
    'mqttHost',
    'mqttPort',
    'mqttUseTls',
    'mqttUser',
    'mqttPass',
    'timezoneOffsetSec',
    'keepSetupApEnabled',
    'feedingSchedule',
    'provider',
    'signature'
  ]
});

checkSnippets(checks, allFiles, {
  category: 'config-v3',
  id: 'config.signing-payload-v3-order',
  label: 'Signing payload v3 order and HMAC implementation exist',
  files: ['src/services/configFile.service.js'],
  snippets: [
    'buildSigningPayloadV3',
    'version=${config.version}',
    'configId=${config.configId}',
    'configVersion=${config.configVersion}',
    'issuedAt=${config.issuedAt}',
    'expiresAt=${config.expiresAt}',
    'machineCode=${config.machineCode}',
    'deviceId=${config.deviceId}',
    'wifiSsid=${config.wifiSsid}',
    'wifiPass=${config.wifiPass}',
    'mqttUseTls=${boolText(config.mqttUseTls)}',
    'schedule.count=${config.feedingSchedule.items.length}',
    'provider.name=${normalizedProvider.name}',
    'createHmac',
    'sha256'
  ]
});

checkSnippets(checks, allFiles, {
  category: 'config-v3',
  id: 'config.download-headers',
  label: 'Config file download uses octet-stream and no-extension filename',
  files: ['src/controllers/configFile.controller.js'],
  snippets: ['application/octet-stream', 'Content-Disposition', 'filename=']
});

checkSnippets(checks, allFiles, {
  category: 'mqtt',
  id: 'mqtt.connection-service',
  label: 'MQTT connection service subscribes and publishes expected topics',
  files: ['src/mqtt/mqttClient.js', 'src/mqtt/mqttRouter.js', 'src/mqtt/mqttPublisher.js'],
  snippets: ['feeder/+/online', 'feeder/+/state', 'feeder/+/telemetry', 'feeder/+/event', 'feeder/+/ack', 'feeder/${deviceId}/cmd']
});

checkSnippets(checks, allFiles, {
  category: 'mqtt',
  id: 'mqtt.inbound-handlers',
  label: 'MQTT inbound handlers update status, commands, config and history',
  files: ['src/services/mqttInbound.service.js'],
  snippets: ['handleOnlineMessage', 'handleStateMessage', 'handleTelemetryMessage', 'handleAckMessage', 'handleEventMessage', 'config_applied', 'feed_finished']
});

checkSnippets(checks, allFiles, {
  category: 'workers',
  id: 'workers.command-timeout',
  label: 'Command timeout worker exists and updates stale commands',
  files: ['src/workers/commandTimeout.worker.js'],
  snippets: ['commandAckTimeoutSec', 'commandCompleteTimeoutSec', 'timeout']
});

checkSnippets(checks, allFiles, {
  category: 'workers',
  id: 'workers.device-offline',
  label: 'Device offline worker exists and marks stale telemetry offline',
  files: ['src/workers/deviceOffline.worker.js'],
  snippets: ['deviceOnlineTtlSec', 'last_telemetry_at', 'offline']
});

checkSnippets(checks, allFiles, {
  category: 'security',
  id: 'security.no-secret-response-current-config',
  label: 'Current config hides Wi-Fi password',
  files: ['src/services/currentConfig.service.js'],
  snippets: ['hasWifiPassword', 'wifiPassword']
});

checkSnippets(checks, allFiles, {
  category: 'security',
  id: 'security.redaction',
  label: 'Secret redaction helper and logging protection exist',
  files: ['src/utils/redact.js', 'src/middleware/errorHandler.js', 'src/services/audit.service.js'],
  snippets: ['wifi', 'mqtt', 'secret', 'pairing', 'redact']
});

checkSnippets(checks, allFiles, {
  category: 'security',
  id: 'security.rate-limits',
  label: 'Rate limits exist for auth/link/feed/config/admin sensitive actions',
  files: ['src/middleware/rateLimits.js', 'src/routes/auth.routes.js', 'src/routes/device.routes.js', 'src/routes/admin.routes.js'],
  snippets: ['authRateLimiter', 'linkDeviceRateLimiter', 'feedNowRateLimiter', 'configGenerationRateLimiter', 'adminSensitiveRateLimiter']
});

checkSnippets(checks, allFiles, {
  category: 'security',
  id: 'security.admin-role',
  label: 'Admin routes require authentication and admin role',
  files: ['src/routes/admin.routes.js'],
  snippets: ["router.use('/admin', authenticate, requireRole(['admin']))"]
});

checkSnippets(checks, allFiles, {
  category: 'security',
  id: 'security.ownership-checks',
  label: 'User device APIs enforce ownership',
  files: ['src/services/device.service.js', 'src/services/configFile.service.js', 'src/services/command.service.js', 'src/services/operationLog.service.js'],
  snippets: ['owner_user_id', 'userId']
});

checkSnippets(checks, allFiles, {
  category: 'audit',
  id: 'audit.service-and-export',
  label: 'Audit logging and export APIs exist',
  files: ['src/services/audit.service.js', 'src/controllers/adminSystem.controller.js', 'src/routes/admin.routes.js'],
  snippets: ['writeAuditLog', 'listAuditLogs', 'exportAuditLogs', '/admin/audit-logs/export']
});

checkSnippets(checks, allFiles, {
  category: 'settings',
  id: 'settings.provider-runtime',
  label: 'System settings provide runtime defaults and provider config',
  files: ['src/services/systemSettings.service.js', 'src/services/configFile.service.js', 'sql/seeds/seed_system_settings.sql'],
  snippets: ['provider', 'configFileTtlSec', 'defaultTimezone', 'getProviderSettings', 'getServerDefaultSettings']
});

checkSnippets(checks, allFiles, {
});

const failed = checks.filter((check) => check.status === 'fail');
const warned = checks.filter((check) => check.status === 'warn');
const passed = checks.filter((check) => check.status === 'pass');

const summary = {
  generatedAt: new Date().toISOString(),
  project: 'pet-feeder-server',
  targetSpec: 'Server Spec V4.1 Full',
  phase: 21,
  total: checks.length,
  passed: passed.length,
  failed: failed.length,
  warnings: warned.length,
  staticCompliance: failed.length === 0,
  notes: [
    'This check validates source structure, routes, migrations, config signing logic, security guards and runtime artifacts.',
    'It does not replace end-to-end testing with a real MySQL/MariaDB server, MQTT broker and ESP8266 machine.'
  ]
};

const report = { summary, checks };
await mkdir(dirname(OUTPUT_JSON), { recursive: true });
await writeFile(OUTPUT_JSON, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

const byCategory = new Map();
for (const check of checks) {
  if (!byCategory.has(check.category)) byCategory.set(check.category, []);
  byCategory.get(check.category).push(check);
}

const mdLines = [
  '# Phase 21 — Spec Compliance Report',
  '',
  `Generated at: ${summary.generatedAt}`,
  '',
  '## Summary',
  '',
  `- Target spec: ${summary.targetSpec}`,
  `- Total checks: ${summary.total}`,
  `- Passed: ${summary.passed}`,
  `- Failed: ${summary.failed}`,
  `- Warnings: ${summary.warnings}`,
  `- Static compliance: ${summary.staticCompliance ? 'PASS' : 'FAIL'}`,
  '',
  '## Scope',
  '',
  '- Real end-to-end validation still needs MySQL/MariaDB, MQTT broker and ESP8266 Machine hardware.',
  ''
];

for (const [category, categoryChecks] of byCategory.entries()) {
  mdLines.push(`## ${category}`);
  mdLines.push('');
  mdLines.push('| Status | ID | Check | Evidence |');
  mdLines.push('|---|---|---|---|');
  for (const check of categoryChecks) {
    const icon = check.status === 'pass' ? '✅' : check.status === 'warn' ? '⚠️' : '❌';
    mdLines.push(`| ${icon} ${check.status} | \`${check.id}\` | ${check.label.replaceAll('|', '\\|')} | ${check.evidence.join('<br>').replaceAll('|', '\\|')} |`);
  }
  mdLines.push('');
}

await writeFile(OUTPUT_MD, `${mdLines.join('\n')}\n`, 'utf8');

if (failed.length > 0) {
  console.error(`Spec compliance check failed: ${failed.length} failing checks.`);
  for (const check of failed) {
    console.error(`- ${check.id}: ${check.notes || check.label}`);
  }
  process.exit(1);
}

console.log(`Spec compliance check passed: ${passed.length}/${checks.length} checks passed.`);
console.log(`Report JSON: ${OUTPUT_JSON}`);
console.log(`Report MD: ${OUTPUT_MD}`);
