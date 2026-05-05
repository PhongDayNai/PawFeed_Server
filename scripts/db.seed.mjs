import bcrypt from 'bcryptjs';
import { env } from '../src/config/env.js';
import {
  seedsDir,
  listSqlFiles,
  readSqlFile,
  openDbConnection,
  runSql,
  escapeSqlValue,
  boolToSql,
  logDbTarget
} from './db/common.mjs';

const seedOrder = [
  'seed_admin.sql',
  'seed_mqtt_server.sql',
  'seed_demo_device.sql',
  'seed_system_settings.sql'
];

async function buildSeedVariables() {
  const adminPasswordHash = await bcrypt.hash(env.seed.adminPassword, 10);

  return {
    ADMIN_FULL_NAME: escapeSqlValue(env.seed.adminFullName),
    ADMIN_EMAIL: escapeSqlValue(env.seed.adminEmail),
    ADMIN_PASSWORD_HASH: escapeSqlValue(adminPasswordHash),
    MQTT_SERVER_NAME: escapeSqlValue(env.seed.mqttServerName),
    MQTT_HOST: escapeSqlValue(env.seed.mqttHost),
    MQTT_PORT: String(env.seed.mqttPort),
    MQTT_TLS_PORT: String(env.seed.mqttTlsPort),
    MQTT_WEBSOCKET_PORT: String(env.seed.mqttWebsocketPort),
    MQTT_USE_TLS: boolToSql(env.seed.mqttUseTls),
    DEMO_DEVICE_ID: escapeSqlValue(env.seed.demoDeviceId),
    DEMO_MACHINE_CODE: escapeSqlValue(env.seed.demoMachineCode),
    DEMO_PAIRING_CODE: escapeSqlValue(env.seed.demoPairingCode),
    DEMO_DEVICE_SECRET: escapeSqlValue(env.seed.demoDeviceSecret),
    DEMO_MQTT_USERNAME: escapeSqlValue(env.seed.demoMqttUsername),
    DEMO_MQTT_PASSWORD: escapeSqlValue(env.seed.demoMqttPassword)
  };
}

function applyTemplate(sql, variables) {
  return Object.entries(variables).reduce(
    (current, [key, value]) => current.replaceAll(`{{${key}}}`, value),
    sql
  );
}

async function main() {
  logDbTarget();
  const connection = await openDbConnection({ multipleStatements: true });
  try {
    const discoveredFiles = await listSqlFiles(seedsDir);
    const files = [
      ...seedOrder.filter((file) => discoveredFiles.includes(file)),
      ...discoveredFiles.filter((file) => !seedOrder.includes(file))
    ];
    const variables = await buildSeedVariables();

    for (const file of files) {
      const sql = applyTemplate(await readSqlFile(seedsDir, file), variables);
      console.log(`[seed] apply ${file}`);
      await runSql(connection, sql);
    }

    console.log(`[seed] done. total=${files.length}`);
    console.log(`[seed] admin email=${env.seed.adminEmail}`);
    console.log('[seed] admin password is taken from SEED_ADMIN_PASSWORD. Do not use this default in production.');
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('[seed] failed:', error.message);
  process.exit(1);
});
