INSERT INTO devices (
  device_id,
  machine_code,
  claim_code,
  claim_code_used_at,
  claim_code_rotated_at,
  owner_user_id,
  device_secret,
  firmware_version,
  status,
  active_config_id,
  active_config_version,
  last_seen_at,
  last_online_at,
  last_offline_at,
  created_at,
  updated_at
) VALUES (
  {{DEMO_DEVICE_ID}},
  {{DEMO_MACHINE_CODE}},
  {{DEMO_PAIRING_CODE}},
  NULL,
  NULL,
  NULL,
  {{DEMO_DEVICE_SECRET}},
  '1.0.0-dev',
  'not_configured',
  NULL,
  0,
  NULL,
  NULL,
  NULL,
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  machine_code = VALUES(machine_code),
  claim_code = IF(claim_code_used_at IS NULL, VALUES(claim_code), claim_code),
  device_secret = VALUES(device_secret),
  firmware_version = VALUES(firmware_version),
  updated_at = NOW();

SET @demo_device_pk = (SELECT id FROM devices WHERE device_id = {{DEMO_DEVICE_ID}} LIMIT 1);
SET @mqtt_server_pk = (SELECT id FROM mqtt_servers WHERE name = {{MQTT_SERVER_NAME}} LIMIT 1);

INSERT INTO device_mqtt_credentials (
  device_id,
  mqtt_server_id,
  mqtt_username,
  mqtt_password,
  is_active,
  created_at,
  updated_at
) VALUES (
  @demo_device_pk,
  @mqtt_server_pk,
  {{DEMO_MQTT_USERNAME}},
  {{DEMO_MQTT_PASSWORD}},
  TRUE,
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  device_id = VALUES(device_id),
  mqtt_server_id = VALUES(mqtt_server_id),
  mqtt_password = VALUES(mqtt_password),
  is_active = TRUE,
  updated_at = NOW();

INSERT INTO device_latest_status (
  device_id,
  online,
  mode,
  is_feeding,
  door_open,
  wifi_connected,
  server_connected,
  time_synced,
  schedule_enabled,
  schedule_count,
  active_config_id,
  active_config_version,
  last_seen_at,
  last_telemetry_at,
  updated_at
) VALUES (
  @demo_device_pk,
  FALSE,
  'unknown',
  FALSE,
  FALSE,
  FALSE,
  FALSE,
  FALSE,
  FALSE,
  0,
  NULL,
  0,
  NULL,
  NULL,
  NOW()
)
ON DUPLICATE KEY UPDATE
  updated_at = NOW();
