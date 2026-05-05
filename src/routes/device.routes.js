import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  getDevice,
  getDeviceStatus,
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
  getConfigGenerations,
  regenerateConfigFileController
} from '../controllers/configFile.controller.js';
import {
  deviceParamsSchema,
  linkDeviceSchema,
  updateUserDeviceSchema
} from '../validators/device.validator.js';
import { saveCurrentConfigSchema } from '../validators/config.validator.js';
import { saveScheduleSchema } from '../validators/schedule.validator.js';
import { createConfigFileSchema, configFileQuerySchema } from '../validators/configFile.validator.js';
import { paginationQuerySchema } from '../validators/pagination.validator.js';
import {
  feedNow,
  getCommandStatus,
  listCommands
} from '../controllers/command.controller.js';
import {
  commandParamsSchema,
  feedNowBodySchema,
  listCommandsQuerySchema
} from '../validators/command.validator.js';

const router = Router();

router.use('/devices', authenticate);

router.post('/devices/link', validateBody(linkDeviceSchema), asyncHandler(linkDevice));
router.get('/devices', asyncHandler(listDevices));
router.get('/devices/:deviceId/status', validateParams(deviceParamsSchema), asyncHandler(getDeviceStatus));
router.get('/devices/:deviceId/current-config', validateParams(deviceParamsSchema), asyncHandler(getCurrentConfig));
router.put(
  '/devices/:deviceId/current-config',
  validateParams(deviceParamsSchema),
  validateBody(saveCurrentConfigSchema),
  asyncHandler(putCurrentConfig)
);
router.get('/devices/:deviceId/schedule', validateParams(deviceParamsSchema), asyncHandler(getSchedule));
router.put(
  '/devices/:deviceId/schedule',
  validateParams(deviceParamsSchema),
  validateBody(saveScheduleSchema),
  asyncHandler(putSchedule)
);
router.get(
  '/devices/:deviceId/schedule/apply-status',
  validateParams(deviceParamsSchema),
  asyncHandler(getScheduleApplyStatus)
);

router.post(
  '/devices/:deviceId/config-file',
  validateParams(deviceParamsSchema),
  validateQuery(configFileQuerySchema),
  validateBody(createConfigFileSchema),
  asyncHandler(createConfigFile)
);
router.post(
  '/devices/:deviceId/config-file/regenerate',
  validateParams(deviceParamsSchema),
  validateQuery(configFileQuerySchema),
  asyncHandler(regenerateConfigFileController)
);

router.post(
  '/devices/:deviceId/commands/feed-now',
  validateParams(deviceParamsSchema),
  validateBody(feedNowBodySchema),
  asyncHandler(feedNow)
);
router.get(
  '/devices/:deviceId/commands',
  validateParams(deviceParamsSchema),
  validateQuery(listCommandsQuerySchema),
  asyncHandler(listCommands)
);
router.get(
  '/devices/:deviceId/commands/:requestId',
  validateParams(commandParamsSchema),
  asyncHandler(getCommandStatus)
);

router.get(
  '/devices/:deviceId/config-generations',
  validateParams(deviceParamsSchema),
  validateQuery(paginationQuerySchema),
  asyncHandler(getConfigGenerations)
);
router.get('/devices/:deviceId', validateParams(deviceParamsSchema), asyncHandler(getDevice));
router.patch(
  '/devices/:deviceId',
  validateParams(deviceParamsSchema),
  validateBody(updateUserDeviceSchema),
  asyncHandler(patchDevice)
);
router.post('/devices/:deviceId/unlink', validateParams(deviceParamsSchema), asyncHandler(unlinkDevice));

export default router;
