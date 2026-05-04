import mysql from 'mysql2/promise';
import { env } from './env.js';

let pool;

export function getDbConfig({ withDatabase = true, multipleStatements = false } = {}) {
  return {
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    ...(withDatabase ? { database: env.db.database } : {}),
    waitForConnections: true,
    connectionLimit: env.db.connectionLimit,
    namedPlaceholders: true,
    multipleStatements,
    ...(env.db.ssl ? { ssl: { rejectUnauthorized: true } } : {})
  };
}

export function getPool() {
  if (!pool) {
    pool = mysql.createPool(getDbConfig({ withDatabase: true }));
  }
  return pool;
}

export async function getConnection(options = {}) {
  return mysql.createConnection(getDbConfig(options));
}

export async function ensureDatabaseExists() {
  const connection = await getConnection({ withDatabase: false, multipleStatements: false });
  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${env.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  } finally {
    await connection.end();
  }
}

export async function checkDbConnection() {
  const connection = await getConnection({ withDatabase: true });
  try {
    const [rows] = await connection.query('SELECT 1 AS ok');
    return rows?.[0]?.ok === 1;
  } finally {
    await connection.end();
  }
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
