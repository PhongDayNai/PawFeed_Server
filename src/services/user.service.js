import { getPool } from '../config/db.js';
import { normalizeEmail, toPublicUser } from '../utils/user.js';

const userSelectColumns = `
  id,
  full_name,
  email,
  password_hash,
  role,
  is_disabled,
  created_at,
  updated_at
`;

export async function findUserById(userId) {
  const pool = getPool();
  const [rows] = await pool.execute(
    `SELECT ${userSelectColumns} FROM users WHERE id = ? LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

export async function findUserByEmail(email) {
  const pool = getPool();
  const [rows] = await pool.execute(
    `SELECT ${userSelectColumns} FROM users WHERE email = ? LIMIT 1`,
    [normalizeEmail(email)]
  );
  return rows[0] || null;
}

export async function createUser({ fullName = null, email, passwordHash, role = 'user' }) {
  const pool = getPool();
  const normalizedEmail = normalizeEmail(email);

  const [result] = await pool.execute(
    `INSERT INTO users (full_name, email, password_hash, role, is_disabled, created_at, updated_at)
     VALUES (?, ?, ?, ?, FALSE, NOW(), NOW())`,
    [fullName, normalizedEmail, passwordHash, role]
  );

  return findUserById(result.insertId);
}

export async function updateUserProfile(userId, { fullName }) {
  const pool = getPool();
  await pool.execute(
    `UPDATE users SET full_name = ?, updated_at = NOW() WHERE id = ?`,
    [fullName, userId]
  );
  return findUserById(userId);
}

export async function updateUserPassword(userId, passwordHash) {
  const pool = getPool();
  await pool.execute(
    `UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?`,
    [passwordHash, userId]
  );
  return findUserById(userId);
}

export { toPublicUser };
