import { getPool } from '../config/db.js';

export async function addToDenylist(jti) {
  const pool = getPool();
  await pool.execute(
    'INSERT IGNORE INTO refresh_token_denylist (jti) VALUES (?)',
    [jti]
  );
}

export async function isInDenylist(jti) {
  const pool = getPool();
  const [rows] = await pool.execute(
    'SELECT 1 FROM refresh_token_denylist WHERE jti = ? LIMIT 1',
    [jti]
  );
  return rows.length > 0;
}