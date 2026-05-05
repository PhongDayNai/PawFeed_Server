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

function orderSeedFiles(files) {
  const priority = new Map([
    ['seed_admin.sql', 10],
    ['seed_mqtt_server.sql', 20],
    ['seed_system_settings.sql', 30],
    ['seed_demo_device.sql', 40]
  ]);

  return [...files].sort((left, right) => {
    const leftPriority = priority.get(left) ?? 100;
    const rightPriority = priority.get(right) ?? 100;

    return leftPriority - rightPriority || left.localeCompare(right);
  });
}

async function main() {
  logDbTarget();
  const connection = await openDbConnection({ multipleStatements: true });
  try {
    const files = orderSeedFiles(await listSqlFiles(seedsDir));
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
