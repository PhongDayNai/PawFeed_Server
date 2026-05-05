import { env } from '../config/env.js';
import { createCommandTimeoutWorker } from './commandTimeout.worker.js';
import { createDeviceOfflineWorker } from './deviceOffline.worker.js';

class WorkerManager {
  constructor(workers = []) {
    this.workers = workers;
    this.started = false;
  }

  start() {
    if (!env.workers.enabled) {
      console.log('[workers] disabled by WORKERS_ENABLED=false');
      return;
    }

    if (this.started) return;
    this.started = true;

    for (const worker of this.workers) {
      worker.start();
    }
  }

  async stop() {
    if (!this.started) return;
    for (const worker of [...this.workers].reverse()) {
      await worker.stop();
    }
    this.started = false;
  }

  async runOnce() {
    const results = {};
    for (const worker of this.workers) {
      results[worker.name] = await worker.runOnce();
    }
    return results;
  }
}

export const workerManager = new WorkerManager([
  createCommandTimeoutWorker(),
  createDeviceOfflineWorker()
]);

export { WorkerManager };
