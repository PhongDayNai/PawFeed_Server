import { env } from '../config/env.js';
import { successResponse } from '../utils/response.js';

export function getHealth(_req, res) {
  res.json(
    successResponse({
      service: env.appName,
      version: env.appVersion,
      environment: env.nodeEnv,
      uptimeSec: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    })
  );
}
