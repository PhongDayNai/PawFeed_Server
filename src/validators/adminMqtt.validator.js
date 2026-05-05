import { z } from 'zod';
import { deviceIdParamSchema, optionalTrimmedString, paginationQuerySchema } from './common.validator.js';

export const mqttServerParamsSchema = z.object({
  id: z.coerce.number().int().positive('MQTT server ID must be a positive integer.')
}).strict();

export const listMqttServersQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(100).optional(),
  isActive: z.coerce.boolean().optional()
}).strict();

export const createMqttServerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  host: z.string().trim().min(1).max(255),
  mqttPort: z.coerce.number().int().min(1).max(65535).optional().default(1883),
  tlsPort: z.coerce.number().int().min(1).max(65535).optional().default(8883),
  websocketPort: z.coerce.number().int().min(1).max(65535).nullable().optional(),
  useTls: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true)
}).strict();

export const updateMqttServerSchema = z.object({
  name: optionalTrimmedString(100),
  host: optionalTrimmedString(255),
  mqttPort: z.coerce.number().int().min(1).max(65535).optional(),
  tlsPort: z.coerce.number().int().min(1).max(65535).optional(),
  websocketPort: z.coerce.number().int().min(1).max(65535).nullable().optional(),
  useTls: z.boolean().optional(),
  isActive: z.boolean().optional()
}).strict().refine((value) => Object.keys(value).length > 0, 'At least one field is required.');

export const adminDeviceMqttCredentialParamsSchema = deviceIdParamSchema;

export const rotateMqttCredentialSchema = z.object({
  mqttServerId: z.coerce.number().int().positive().optional(),
  mqttUsername: optionalTrimmedString(150),
  mqttPassword: optionalTrimmedString(255)
}).strict();

export const rotateDeviceSecretSchema = z.object({
  deviceSecret: optionalTrimmedString(255)
}).strict();
