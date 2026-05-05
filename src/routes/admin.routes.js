import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import { adminPing } from '../controllers/admin.controller.js';
import { adminDashboard } from '../controllers/adminDashboard.controller.js';
import { listAdminDeviceCommands } from '../controllers/command.controller.js';
import {
  createDevice,
  disableDevice,
  enableDevice,
  getDevice,
  getDeviceLinkAttempts,
  getDevicePairingStatus,
  getDeviceQr,
  listDevices,
  revokeDevice,
  rotateDevicePairingCode,
  transferDeviceOwner,
  unlinkDevice,
  updateDevice
} from '../controllers/adminDevice.controller.js';
import {
  adminDeviceParamsSchema,
  createAdminDeviceSchema,
  linkAttemptsQuerySchema,
  listAdminDevicesQuerySchema,
  transferOwnerSchema,
  updateAdminDeviceSchema
} from '../validators/adminDevice.validator.js';
import {
  disableUser,
  enableUser,
  getUser,
  listUsers,
  resetUserPassword,
  updateUser
} from '../controllers/adminUser.controller.js';
import {
  adminUserParamsSchema,
  listAdminUsersQuerySchema,
  resetAdminUserPasswordSchema,
  updateAdminUserSchema
} from '../validators/adminUser.validator.js';
import {
  exportAuditLogs,
  getAuditLogs,
  getSystemSettings,
  updateSystemSettings
} from '../controllers/adminSystem.controller.js';
import {
  exportAuditLogsQuerySchema,
  listAuditLogsQuerySchema,
  patchSystemSettingsSchema
} from '../validators/adminSystem.validator.js';
import {
  getDeviceMqttCredentialController,
  listDeviceMqttCredentialsController,
  getMqttServerDetail,
  getMqttServers,
  patchMqttServer,
  postMqttServer,
  postMqttServerTest,
  rotateDeviceMqttCredentialController,
  rotateDeviceSecretController
} from '../controllers/adminMqtt.controller.js';
import {
  adminDeviceMqttCredentialParamsSchema,
  createMqttServerSchema,
  listMqttServersQuerySchema,
  mqttServerParamsSchema,
  rotateDeviceSecretSchema,
  rotateMqttCredentialSchema,
  testMqttServerSchema,
  updateMqttServerSchema
} from '../validators/adminMqtt.validator.js';
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
router.get('/admin/dashboard', asyncHandler(adminDashboard));

router.get('/admin/users', validateQuery(listAdminUsersQuerySchema), asyncHandler(listUsers));
router.get('/admin/users/:userId', validateParams(adminUserParamsSchema), asyncHandler(getUser));
router.patch('/admin/users/:userId', validateParams(adminUserParamsSchema), validateBody(updateAdminUserSchema), asyncHandler(updateUser));
router.post('/admin/users/:userId/disable', validateParams(adminUserParamsSchema), asyncHandler(disableUser));
router.post('/admin/users/:userId/enable', validateParams(adminUserParamsSchema), asyncHandler(enableUser));
router.post('/admin/users/:userId/reset-password', validateParams(adminUserParamsSchema), validateBody(resetAdminUserPasswordSchema), asyncHandler(resetUserPassword));

router.get('/admin/device-commands', validateQuery(listAdminCommandsQuerySchema), asyncHandler(listAdminDeviceCommands));
router.get('/admin/device-events', validateQuery(listAdminDeviceEventsQuerySchema), asyncHandler(getAdminDeviceEvents));
router.get('/admin/feeding-histories', validateQuery(listAdminFeedingHistoriesQuerySchema), asyncHandler(getAdminFeedingHistories));
router.get('/admin/config-generations', validateQuery(listAdminConfigGenerationsQuerySchema), asyncHandler(getAdminConfigGenerations));
router.get('/admin/config-generations/:configId', validateParams(configGenerationParamsSchema), asyncHandler(getAdminConfigGenerationDetail));
router.post('/admin/config-generations/:configId/revoke', validateParams(configGenerationParamsSchema), asyncHandler(revokeConfigGeneration));

router.get('/admin/system-settings', asyncHandler(getSystemSettings));
router.patch('/admin/system-settings', validateBody(patchSystemSettingsSchema), asyncHandler(updateSystemSettings));
router.get('/admin/audit-logs/export', validateQuery(exportAuditLogsQuerySchema), asyncHandler(exportAuditLogs));
router.get('/admin/audit-logs', validateQuery(listAuditLogsQuerySchema), asyncHandler(getAuditLogs));

router.get('/admin/mqtt-servers', validateQuery(listMqttServersQuerySchema), asyncHandler(getMqttServers));
router.post('/admin/mqtt-servers', validateBody(createMqttServerSchema), asyncHandler(postMqttServer));
router.get('/admin/mqtt-servers/:id', validateParams(mqttServerParamsSchema), asyncHandler(getMqttServerDetail));
router.patch('/admin/mqtt-servers/:id', validateParams(mqttServerParamsSchema), validateBody(updateMqttServerSchema), asyncHandler(patchMqttServer));
router.post('/admin/mqtt-servers/:id/test', validateParams(mqttServerParamsSchema), validateBody(testMqttServerSchema), asyncHandler(postMqttServerTest));

router.post('/admin/devices', validateBody(createAdminDeviceSchema), asyncHandler(createDevice));
router.get('/admin/devices', validateQuery(listAdminDevicesQuerySchema), asyncHandler(listDevices));
router.get('/admin/devices/:deviceId', validateParams(adminDeviceParamsSchema), asyncHandler(getDevice));
router.patch('/admin/devices/:deviceId', validateParams(adminDeviceParamsSchema), validateBody(updateAdminDeviceSchema), asyncHandler(updateDevice));
router.post('/admin/devices/:deviceId/disable', validateParams(adminDeviceParamsSchema), asyncHandler(disableDevice));
router.post('/admin/devices/:deviceId/enable', validateParams(adminDeviceParamsSchema), asyncHandler(enableDevice));
router.post('/admin/devices/:deviceId/revoke', validateParams(adminDeviceParamsSchema), asyncHandler(revokeDevice));
router.post('/admin/devices/:deviceId/unlink', validateParams(adminDeviceParamsSchema), asyncHandler(unlinkDevice));
router.post('/admin/devices/:deviceId/transfer-owner', validateParams(adminDeviceParamsSchema), validateBody(transferOwnerSchema), asyncHandler(transferDeviceOwner));
router.get('/admin/devices/:deviceId/qr', validateParams(adminDeviceParamsSchema), asyncHandler(getDeviceQr));
router.get('/admin/devices/:deviceId/pairing-code/status', validateParams(adminDeviceParamsSchema), asyncHandler(getDevicePairingStatus));
router.post('/admin/devices/:deviceId/rotate-pairing-code', validateParams(adminDeviceParamsSchema), asyncHandler(rotateDevicePairingCode));
router.get('/admin/devices/:deviceId/link-attempts', validateParams(adminDeviceParamsSchema), validateQuery(linkAttemptsQuerySchema), asyncHandler(getDeviceLinkAttempts));
router.get('/admin/devices/:deviceId/mqtt-credential', validateParams(adminDeviceMqttCredentialParamsSchema), asyncHandler(getDeviceMqttCredentialController));
router.get('/admin/devices/:deviceId/mqtt-credentials', validateParams(adminDeviceMqttCredentialParamsSchema), asyncHandler(listDeviceMqttCredentialsController));
router.post('/admin/devices/:deviceId/rotate-mqtt-credential', validateParams(adminDeviceMqttCredentialParamsSchema), validateBody(rotateMqttCredentialSchema), asyncHandler(rotateDeviceMqttCredentialController));
router.post('/admin/devices/:deviceId/rotate-device-secret', validateParams(adminDeviceMqttCredentialParamsSchema), validateBody(rotateDeviceSecretSchema), asyncHandler(rotateDeviceSecretController));

export default router;
