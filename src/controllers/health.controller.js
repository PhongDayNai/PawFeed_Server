import { env } from '../config/env.js';
import { sendSuccess } from '../utils/response.js';

export function getHealth(_req, res) {
  return sendSuccess(res, {
    service: env.appName,
    version: env.appVersion,
    environment: env.nodeEnv,
    uptimeSec: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
}
