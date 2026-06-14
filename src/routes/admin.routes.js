import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate } from '../middleware/auth.js';
import {
  listWiki,
  getWiki,
  createWiki,
  updateWiki,
  deleteWiki
} from '../controllers/adminChatbotWiki.controller.js';
import {
  adminChatbotWikiParamsSchema,
  listAdminChatbotWikiQuerySchema,
  createAdminChatbotWikiSchema,
  updateAdminChatbotWikiSchema
} from '../validators/adminChatbotWiki.validator.js';
import { requireRole } from '../middleware/requireRole.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import { adminSensitiveRateLimiter } from '../middleware/rateLimits.js';
import { adminPing } from '../controllers/admin.controller.js';
import { adminDashboard } from '../controllers/adminDashboard.controller.js';
import { listAdminDeviceCommands } from '../controllers/command.controller.js';
import {
  createDevice,
  deleteDevice,
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

router.use('/', authenticate, requireRole(['admin']));

router.get('/ping', asyncHandler(adminPing));
router.get('/dashboard', asyncHandler(adminDashboard));

router.get('/users', validateQuery(listAdminUsersQuerySchema), asyncHandler(listUsers));
router.get('/users/:userId', validateParams(adminUserParamsSchema), asyncHandler(getUser));
router.patch('/users/:userId', adminSensitiveRateLimiter, validateParams(adminUserParamsSchema), validateBody(updateAdminUserSchema), asyncHandler(updateUser));
router.post('/users/:userId/disable', adminSensitiveRateLimiter, validateParams(adminUserParamsSchema), asyncHandler(disableUser));
router.post('/users/:userId/enable', adminSensitiveRateLimiter, validateParams(adminUserParamsSchema), asyncHandler(enableUser));
router.post('/users/:userId/reset-password', adminSensitiveRateLimiter, validateParams(adminUserParamsSchema), validateBody(resetAdminUserPasswordSchema), asyncHandler(resetUserPassword));

router.get('/device-commands', validateQuery(listAdminCommandsQuerySchema), asyncHandler(listAdminDeviceCommands));
router.get('/device-events', validateQuery(listAdminDeviceEventsQuerySchema), asyncHandler(getAdminDeviceEvents));
router.get('/feeding-histories', validateQuery(listAdminFeedingHistoriesQuerySchema), asyncHandler(getAdminFeedingHistories));
router.get('/config-generations', validateQuery(listAdminConfigGenerationsQuerySchema), asyncHandler(getAdminConfigGenerations));
router.get('/config-generations/:configId', validateParams(configGenerationParamsSchema), asyncHandler(getAdminConfigGenerationDetail));
router.post('/config-generations/:configId/revoke', adminSensitiveRateLimiter, validateParams(configGenerationParamsSchema), asyncHandler(revokeConfigGeneration));

router.get('/system-settings', asyncHandler(getSystemSettings));
router.patch('/system-settings', adminSensitiveRateLimiter, validateBody(patchSystemSettingsSchema), asyncHandler(updateSystemSettings));
router.get('/audit-logs/export', validateQuery(exportAuditLogsQuerySchema), asyncHandler(exportAuditLogs));
router.get('/audit-logs', validateQuery(listAuditLogsQuerySchema), asyncHandler(getAuditLogs));

router.get('/mqtt-servers', validateQuery(listMqttServersQuerySchema), asyncHandler(getMqttServers));
router.post('/mqtt-servers', adminSensitiveRateLimiter, validateBody(createMqttServerSchema), asyncHandler(postMqttServer));
router.get('/mqtt-servers/:id', validateParams(mqttServerParamsSchema), asyncHandler(getMqttServerDetail));
router.patch('/mqtt-servers/:id', adminSensitiveRateLimiter, validateParams(mqttServerParamsSchema), validateBody(updateMqttServerSchema), asyncHandler(patchMqttServer));
router.post('/mqtt-servers/:id/test', adminSensitiveRateLimiter, validateParams(mqttServerParamsSchema), validateBody(testMqttServerSchema), asyncHandler(postMqttServerTest));

router.post('/devices', adminSensitiveRateLimiter, validateBody(createAdminDeviceSchema), asyncHandler(createDevice));
router.delete('/devices/:deviceId', adminSensitiveRateLimiter, validateParams(adminDeviceParamsSchema), asyncHandler(deleteDevice));
router.get('/devices', validateQuery(listAdminDevicesQuerySchema), asyncHandler(listDevices));
router.get('/devices/:deviceId', validateParams(adminDeviceParamsSchema), asyncHandler(getDevice));
router.patch('/devices/:deviceId', adminSensitiveRateLimiter, validateParams(adminDeviceParamsSchema), validateBody(updateAdminDeviceSchema), asyncHandler(updateDevice));
router.post('/devices/:deviceId/disable', adminSensitiveRateLimiter, validateParams(adminDeviceParamsSchema), asyncHandler(disableDevice));
router.post('/devices/:deviceId/enable', adminSensitiveRateLimiter, validateParams(adminDeviceParamsSchema), asyncHandler(enableDevice));
router.post('/devices/:deviceId/revoke', adminSensitiveRateLimiter, validateParams(adminDeviceParamsSchema), asyncHandler(revokeDevice));
router.post('/devices/:deviceId/unlink', adminSensitiveRateLimiter, validateParams(adminDeviceParamsSchema), asyncHandler(unlinkDevice));
router.post('/devices/:deviceId/transfer-owner', adminSensitiveRateLimiter, validateParams(adminDeviceParamsSchema), validateBody(transferOwnerSchema), asyncHandler(transferDeviceOwner));
router.get('/devices/:deviceId/qr', validateParams(adminDeviceParamsSchema), asyncHandler(getDeviceQr));
router.get('/devices/:deviceId/pairing-code/status', validateParams(adminDeviceParamsSchema), asyncHandler(getDevicePairingStatus));
router.post('/devices/:deviceId/rotate-pairing-code', adminSensitiveRateLimiter, validateParams(adminDeviceParamsSchema), asyncHandler(rotateDevicePairingCode));
router.get('/devices/:deviceId/link-attempts', validateParams(adminDeviceParamsSchema), validateQuery(linkAttemptsQuerySchema), asyncHandler(getDeviceLinkAttempts));
router.get('/devices/:deviceId/mqtt-credential', validateParams(adminDeviceMqttCredentialParamsSchema), asyncHandler(getDeviceMqttCredentialController));
router.get('/devices/:deviceId/mqtt-credentials', validateParams(adminDeviceMqttCredentialParamsSchema), asyncHandler(listDeviceMqttCredentialsController));
router.post('/devices/:deviceId/rotate-mqtt-credential', adminSensitiveRateLimiter, validateParams(adminDeviceMqttCredentialParamsSchema), validateBody(rotateMqttCredentialSchema), asyncHandler(rotateDeviceMqttCredentialController));
router.post('/devices/:deviceId/rotate-device-secret', adminSensitiveRateLimiter, validateParams(adminDeviceMqttCredentialParamsSchema), validateBody(rotateDeviceSecretSchema), asyncHandler(rotateDeviceSecretController));

// Chatbot Wiki management routes
router.get('/chatbot/wiki', validateQuery(listAdminChatbotWikiQuerySchema), asyncHandler(listWiki));
router.get('/chatbot/wiki/:id', validateParams(adminChatbotWikiParamsSchema), asyncHandler(getWiki));
router.post('/chatbot/wiki', adminSensitiveRateLimiter, validateBody(createAdminChatbotWikiSchema), asyncHandler(createWiki));
router.patch('/chatbot/wiki/:id', adminSensitiveRateLimiter, validateParams(adminChatbotWikiParamsSchema), validateBody(updateAdminChatbotWikiSchema), asyncHandler(updateWiki));
router.delete('/chatbot/wiki/:id', adminSensitiveRateLimiter, validateParams(adminChatbotWikiParamsSchema), asyncHandler(deleteWiki));

export default router;
