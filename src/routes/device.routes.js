import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  configGenerationRateLimiter,
  feedNowRateLimiter,
  linkDeviceRateLimiter
} from '../middleware/rateLimits.js';
import {
  getDevice,
  getDeviceStatus,
  getMqttStatus,
  linkDevice,
  listDevices,
  patchDevice,
  unlinkDevice
} from '../controllers/device.controller.js';
import {
  getCurrentConfig,
  getSchedule,
  getScheduleApplyStatus,
  putCurrentConfig,
  putSchedule
} from '../controllers/currentConfig.controller.js';
import {
  createConfigFile,
  regenerateConfigFileController
} from '../controllers/configFile.controller.js';
import {
  deviceParamsSchema,
  linkDeviceSchema,
  listUserDevicesQuerySchema,
  updateUserDeviceSchema
} from '../validators/device.validator.js';
import { saveCurrentConfigSchema } from '../validators/config.validator.js';
import { saveScheduleSchema } from '../validators/schedule.validator.js';
import { createConfigFileSchema, configFileQuerySchema } from '../validators/configFile.validator.js';

import {
  feedNow,
  getCommandStatus,
  listCommands
} from '../controllers/command.controller.js';
import {
  getUserConfigGenerations,
  getUserDeviceEvents,
  getUserFeedingHistory
} from '../controllers/operationLog.controller.js';
import {
  commandParamsSchema,
  feedNowBodySchema,
  listCommandsQuerySchema
} from '../validators/command.validator.js';
import {
  listConfigGenerationsQuerySchema,
  listDeviceEventsQuerySchema,
  listFeedingHistoryQuerySchema
} from '../validators/operationLog.validator.js';

const router = Router();

router.use('/', authenticate);

router.post('/link', linkDeviceRateLimiter, validateBody(linkDeviceSchema), asyncHandler(linkDevice));
router.get('/', validateQuery(listUserDevicesQuerySchema), asyncHandler(listDevices));
router.get('/:deviceId/status', validateParams(deviceParamsSchema), asyncHandler(getDeviceStatus));
router.get('/:deviceId/mqtt-status', validateParams(deviceParamsSchema), asyncHandler(getMqttStatus));
router.get('/:deviceId/current-config', validateParams(deviceParamsSchema), asyncHandler(getCurrentConfig));
router.put(
  '/:deviceId/current-config',
  validateParams(deviceParamsSchema),
  validateBody(saveCurrentConfigSchema),
  asyncHandler(putCurrentConfig)
);
router.get('/:deviceId/schedule', validateParams(deviceParamsSchema), asyncHandler(getSchedule));
router.put(
  '/:deviceId/schedule',
  validateParams(deviceParamsSchema),
  validateBody(saveScheduleSchema),
  asyncHandler(putSchedule)
);
router.get(
  '/:deviceId/schedule/apply-status',
  validateParams(deviceParamsSchema),
  asyncHandler(getScheduleApplyStatus)
);

router.post(
  '/:deviceId/config-file',
  configGenerationRateLimiter,
  validateParams(deviceParamsSchema),
  validateQuery(configFileQuerySchema),
  validateBody(createConfigFileSchema),
  asyncHandler(createConfigFile)
);
router.post(
  '/:deviceId/config-file/regenerate',
  configGenerationRateLimiter,
  validateParams(deviceParamsSchema),
  validateQuery(configFileQuerySchema),
  asyncHandler(regenerateConfigFileController)
);

router.post(
  '/:deviceId/commands/feed-now',
  feedNowRateLimiter,
  validateParams(deviceParamsSchema),
  validateBody(feedNowBodySchema),
  asyncHandler(feedNow)
);
router.get(
  '/:deviceId/commands',
  validateParams(deviceParamsSchema),
  validateQuery(listCommandsQuerySchema),
  asyncHandler(listCommands)
);
router.get(
  '/:deviceId/commands/:requestId',
  validateParams(commandParamsSchema),
  asyncHandler(getCommandStatus)
);

router.get(
  '/:deviceId/events',
  validateParams(deviceParamsSchema),
  validateQuery(listDeviceEventsQuerySchema),
  asyncHandler(getUserDeviceEvents)
);
router.get(
  '/:deviceId/feeding-history',
  validateParams(deviceParamsSchema),
  validateQuery(listFeedingHistoryQuerySchema),
  asyncHandler(getUserFeedingHistory)
);
router.get(
  '/:deviceId/config-generations',
  validateParams(deviceParamsSchema),
  validateQuery(listConfigGenerationsQuerySchema),
  asyncHandler(getUserConfigGenerations)
);
router.get('/:deviceId', validateParams(deviceParamsSchema), asyncHandler(getDevice));
router.patch(
  '/:deviceId',
  validateParams(deviceParamsSchema),
  validateBody(updateUserDeviceSchema),
  asyncHandler(patchDevice)
);
router.post('/:deviceId/unlink', validateParams(deviceParamsSchema), asyncHandler(unlinkDevice));

export default router;
