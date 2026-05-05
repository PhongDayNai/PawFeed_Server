import { app } from './app.js';
import { env } from './config/env.js';
import { mqttClientService } from './mqtt/mqttClient.js';
import { workerManager } from './workers/index.js';

const server = app.listen(env.port, env.host, () => {
  console.log(`[server] ${env.appName} v${env.appVersion} listening on http://${env.host}:${env.port}`);
  console.log(`[server] environment=${env.nodeEnv}`);
  mqttClientService.start();
  workerManager.start();
});

let isShuttingDown = false;

async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`[server] received ${signal}. Shutting down...`);

  try {
    await workerManager.stop();
  } catch (error) {
    console.error('[server] worker shutdown error:', error);
  }

  try {
    await mqttClientService.stop();
  } catch (error) {
    console.error('[server] MQTT shutdown error:', error);
  }

  server.close((error) => {
    if (error) {
      console.error('[server] shutdown error:', error);
      process.exit(1);
    }
    console.log('[server] stopped.');
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

process.on('unhandledRejection', (reason) => {
  console.error('[server] unhandled rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[server] uncaught exception:', error);
  process.exit(1);
});
