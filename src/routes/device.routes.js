import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validateBody, validateParams } from '../middleware/validate.js';
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
  deviceParamsSchema,
  linkDeviceSchema,
  updateUserDeviceSchema
} from '../validators/device.validator.js';

const router = Router();

router.use('/devices', authenticate);

router.post('/devices/link', validateBody(linkDeviceSchema), asyncHandler(linkDevice));
router.get('/devices', asyncHandler(listDevices));
router.get('/devices/:deviceId', validateParams(deviceParamsSchema), asyncHandler(getDevice));
router.get('/devices/:deviceId/status', validateParams(deviceParamsSchema), asyncHandler(getDeviceStatus));
router.patch(
  '/devices/:deviceId',
  validateParams(deviceParamsSchema),
  validateBody(updateUserDeviceSchema),
  asyncHandler(patchDevice)
);
router.post('/devices/:deviceId/unlink', validateParams(deviceParamsSchema), asyncHandler(unlinkDevice));

export default router;
