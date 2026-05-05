import crypto from 'crypto';
import { customAlphabet } from 'nanoid';

const upperAlnum = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 4);
const lowerId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 8);
const secretId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 32);

export function createPairingCode() {
  return `${upperAlnum()}-${upperAlnum()}`;
}

export function createDeviceSecret() {
  return crypto.randomBytes(32).toString('hex');
}

export function createMqttPassword() {
  return secretId();
}

export function createDeviceId() {
  return `feeder_${lowerId()}`;
}

export function createMachineCode() {
  return `PF-ESP8266-${upperAlnum()}${upperAlnum()}`;
}

export function maskSecret(value) {
  if (!value) return null;
  const text = String(value);
  if (text.length <= 8) return '****';
  return `${text.slice(0, 4)}****${text.slice(-4)}`;
}

export function maskPairingCode(value) {
  if (!value) return null;
  const text = String(value).toUpperCase();
  const [prefix] = text.split('-');
  if (prefix && prefix.length >= 3) return `${prefix}-****`;
  return maskSecret(text);
}
