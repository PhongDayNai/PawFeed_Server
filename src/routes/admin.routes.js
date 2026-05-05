import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import { adminPing } from '../controllers/admin.controller.js';
import { listAdminDeviceCommands } from '../controllers/command.controller.js';
import {
  createDevice,
  getDevice,
  getDevicePairingStatus,
  getDeviceQr,
  listDevices,
  rotateDevicePairingCode
} from '../controllers/adminDevice.controller.js';
import {
  adminDeviceParamsSchema,
  createAdminDeviceSchema,
  listAdminDevicesQuerySchema
} from '../validators/adminDevice.validator.js';
import { listAdminCommandsQuerySchema } from '../validators/command.validator.js';
import {
  getAdminConfigGenerationDetail,
  getAdminConfigGenerations,
  getAdminDeviceEvents,
  getAdminFeedingHistories,
  revokeConfigGeneration
} from '../controllers/operationLog.controller.js';
import {
  configGenerationParamsSchema,
  listAdminConfigGenerationsQuerySchema,
  listAdminDeviceEventsQuerySchema,
  listAdminFeedingHistoriesQuerySchema
} from '../validators/operationLog.validator.js';

const router = Router();

router.use('/admin', authenticate, requireRole(['admin']));

router.get('/admin/ping', asyncHandler(adminPing));
router.get('/admin/device-commands', validateQuery(listAdminCommandsQuerySchema), asyncHandler(listAdminDeviceCommands));
router.get('/admin/device-events', validateQuery(listAdminDeviceEventsQuerySchema), asyncHandler(getAdminDeviceEvents));
router.get('/admin/feeding-histories', validateQuery(listAdminFeedingHistoriesQuerySchema), asyncHandler(getAdminFeedingHistories));
router.get('/admin/config-generations', validateQuery(listAdminConfigGenerationsQuerySchema), asyncHandler(getAdminConfigGenerations));
router.get(
  '/admin/config-generations/:configId',
  validateParams(configGenerationParamsSchema),
  asyncHandler(getAdminConfigGenerationDetail)
);
router.post(
  '/admin/config-generations/:configId/revoke',
  validateParams(configGenerationParamsSchema),
  asyncHandler(revokeConfigGeneration)
);
router.post('/admin/devices', validateBody(createAdminDeviceSchema), asyncHandler(createDevice));
router.get('/admin/devices', validateQuery(listAdminDevicesQuerySchema), asyncHandler(listDevices));
router.get('/admin/devices/:deviceId', validateParams(adminDeviceParamsSchema), asyncHandler(getDevice));
router.get('/admin/devices/:deviceId/qr', validateParams(adminDeviceParamsSchema), asyncHandler(getDeviceQr));
router.get(
  '/admin/devices/:deviceId/pairing-code/status',
  validateParams(adminDeviceParamsSchema),
  asyncHandler(getDevicePairingStatus)
);
router.post(
  '/admin/devices/:deviceId/rotate-pairing-code',
  validateParams(adminDeviceParamsSchema),
  asyncHandler(rotateDevicePairingCode)
);

export default router;
