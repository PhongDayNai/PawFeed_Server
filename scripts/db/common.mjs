import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import mysql from 'mysql2/promise';
import { fileURLToPath } from 'node:url';
import { env } from '../../src/config/env.js';
import { ensureDatabaseExists, getConnection, getDbConfig } from '../../src/config/db.js';

export { getDbConfig };

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const migrationsDir = path.join(projectRoot, 'sql', 'migrations');
export const seedsDir = path.join(projectRoot, 'sql', 'seeds');

export function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

export async function listSqlFiles(directory) {
  const files = await fs.readdir(directory);
  return files
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));
}

export async function readSqlFile(directory, file) {
  return fs.readFile(path.join(directory, file), 'utf8');
}

export async function openDbConnection({ multipleStatements = true } = {}) {
  await ensureDatabaseExists();
  return getConnection({ withDatabase: true, multipleStatements });
}

export async function createMigrationsTable(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      filename VARCHAR(255) UNIQUE NOT NULL,
      checksum CHAR(64) NOT NULL,
      executed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

export async function getExecutedMigrations(connection) {
  await createMigrationsTable(connection);
  const [rows] = await connection.query('SELECT filename, checksum, executed_at FROM schema_migrations ORDER BY filename ASC');
  return new Map(rows.map((row) => [row.filename, row]));
}

export async function runSql(connection, sql) {
  const trimmed = sql.trim();
  if (!trimmed) return;
  await connection.query(trimmed);
}

export function escapeSqlValue(value) {
  return mysql.escape(value);
}

export function boolToSql(value) {
  return value ? 'TRUE' : 'FALSE';
}

export function requireDevResetAllowed() {
  if (env.isProduction) {
    throw new Error('Refusing to reset database when NODE_ENV=production.');
  }
  if (!env.db.allowReset) {
    throw new Error('DB_ALLOW_RESET=true is required before db:reset can run.');
  }
}

export function logDbTarget() {
  console.log(`[db] target mysql://${env.db.user}@${env.db.host}:${env.db.port}/${env.db.database}`);
}

export async function databaseExists() {
  const connection = await mysql.createConnection(getDbConfig({ withDatabase: false }));
  try {
    const [rows] = await connection.query('SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?', [env.db.database]);
    return rows.length > 0;
  } finally {
    await connection.end();
  }
}
