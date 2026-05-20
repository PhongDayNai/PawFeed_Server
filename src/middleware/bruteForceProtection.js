import { env } from '../config/env.js';
import { forbiddenError } from '../utils/errors.js';

const failedAttempts = new Map();
const lockedAccounts = new Map();

function getLoginKey(ip, email) {
  return `${ip}:${email.toLowerCase()}`;
}

function cleanOldAttempts(attempts) {
  const now = Date.now();
  return attempts.filter(a => now - a.timestamp < env.security.lockoutWindowMs);
}

function isLocked(key) {
  const lockTime = lockedAccounts.get(key);
  if (!lockTime) return false;
  if (Date.now() - lockTime > env.security.lockoutDurationMinutes * 60 * 1000) {
    lockedAccounts.delete(key);
    return false;
  }
  return true;
}

export function checkBruteForce(req, _res, next) {
  const email = req.body?.email;
  if (!email || typeof email !== 'string') {
    return next();
  }
  const key = getLoginKey(req.ip, email);

  if (isLocked(key)) {
    return next(forbiddenError(
      'Account temporarily locked due to too many failed login attempts. Please try again later.',
      'ACCOUNT_LOCKED'
    ));
  }

  const attempts = failedAttempts.get(key) || [];
  const recentAttempts = cleanOldAttempts(attempts);

  if (recentAttempts.length >= env.security.maxLoginAttempts) {
    lockedAccounts.set(key, Date.now());
    return next(forbiddenError(
      'Account temporarily locked due to too many failed login attempts. Please try again later.',
      'ACCOUNT_LOCKED'
    ));
  }

  if (recentAttempts.length >= env.security.captchaTriggerAfterAttempts) {
    req.requireCaptcha = true;
  }

  next();
}

export function recordFailedLoginAttempt(req) {
  const key = getLoginKey(req.ip, req.body?.email);

  if (key.endsWith(':undefined') || key.endsWith(':null')) return;

  const attempts = failedAttempts.get(key) || [];
  const recentAttempts = cleanOldAttempts(attempts);

  recentAttempts.push({ timestamp: Date.now() });
  failedAttempts.set(key, recentAttempts);

  if (recentAttempts.length >= env.security.maxLoginAttempts) {
    lockedAccounts.set(key, Date.now());
  }
}

export function clearFailedLoginAttempts(req) {
  const key = getLoginKey(req.ip, req.body?.email);

  if (key.endsWith(':undefined') || key.endsWith(':null')) return;

  failedAttempts.delete(key);
  lockedAccounts.delete(key);
}

export function isAccountLocked(req) {
  const key = getLoginKey(req.ip, req.body?.email);
  return isLocked(key);
}