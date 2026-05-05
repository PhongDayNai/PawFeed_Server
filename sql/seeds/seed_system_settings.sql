INSERT INTO system_settings (
  setting_key,
  setting_value,
  description,
  created_at,
  updated_at
) VALUES
(
  'server_defaults',
  JSON_OBJECT(
    'configFileTtlSec', {{CONFIG_FILE_TTL_SEC}},
    'defaultTimezone', {{DEFAULT_TIMEZONE}},
    'defaultTimezoneOffsetSec', {{DEFAULT_TIMEZONE_OFFSET_SEC}},
    'defaultKeepSetupApEnabled', {{DEFAULT_KEEP_SETUP_AP_ENABLED}},
    'defaultMqttUseTls', {{DEFAULT_MQTT_USE_TLS}},
    'allowDemoKeepSetupAp', {{ALLOW_DEMO_KEEP_SETUP_AP}}
  ),
  'Default values used while generating config files and setup screens.',
  NOW(),
  NOW()
),
(
  'worker_timeouts',
  JSON_OBJECT(
    'deviceOnlineTtlSec', {{DEVICE_ONLINE_TTL_SEC}},
    'commandAckTimeoutSec', {{COMMAND_ACK_TIMEOUT_SEC}},
    'commandCompleteTimeoutSec', {{COMMAND_COMPLETE_TIMEOUT_SEC}}
  ),
  'Runtime worker timeout values.',
  NOW(),
  NOW()
),
(
  'provider',
  JSON_OBJECT(
    'name', {{PROVIDER_NAME}},
    'brand', {{PROVIDER_BRAND}},
    'website', {{PROVIDER_WEBSITE}},
    'contact', {{PROVIDER_CONTACT}},
    'note', {{PROVIDER_NOTE}}
  ),
  'Provider info included in generated config files.',
  NOW(),
  NOW()
),
('CONFIG_FILE_TTL_SEC', JSON_EXTRACT('{{CONFIG_FILE_TTL_SEC}}', '$'), 'Config file TTL in seconds.', NOW(), NOW()),
('DEVICE_ONLINE_TTL_SEC', JSON_EXTRACT('{{DEVICE_ONLINE_TTL_SEC}}', '$'), 'Device online TTL in seconds before stale/offline.', NOW(), NOW()),
('COMMAND_ACK_TIMEOUT_SEC', JSON_EXTRACT('{{COMMAND_ACK_TIMEOUT_SEC}}', '$'), 'Command ack timeout in seconds.', NOW(), NOW()),
('COMMAND_COMPLETE_TIMEOUT_SEC', JSON_EXTRACT('{{COMMAND_COMPLETE_TIMEOUT_SEC}}', '$'), 'Command complete timeout in seconds.', NOW(), NOW()),
('DEFAULT_TIMEZONE', JSON_QUOTE({{DEFAULT_TIMEZONE}}), 'Default timezone for config/current config.', NOW(), NOW()),
('DEFAULT_TIMEZONE_OFFSET_SEC', JSON_EXTRACT('{{DEFAULT_TIMEZONE_OFFSET_SEC}}', '$'), 'Default timezone offset in seconds.', NOW(), NOW()),
('DEFAULT_KEEP_SETUP_AP_ENABLED', JSON_EXTRACT(LOWER('{{DEFAULT_KEEP_SETUP_AP_ENABLED}}'), '$'), 'Default keepSetupApEnabled value.', NOW(), NOW()),
('DEFAULT_MQTT_USE_TLS', JSON_EXTRACT(LOWER('{{DEFAULT_MQTT_USE_TLS}}'), '$'), 'Default MQTT TLS flag for provisioning screens.', NOW(), NOW()),
('ALLOW_DEMO_KEEP_SETUP_AP', JSON_EXTRACT(LOWER('{{ALLOW_DEMO_KEEP_SETUP_AP}}'), '$'), 'Allow demo clients/admins to keep setup AP enabled.', NOW(), NOW()),
('PROVIDER_NAME', JSON_QUOTE({{PROVIDER_NAME}}), 'Provider name used in generated config files.', NOW(), NOW()),
('PROVIDER_BRAND', JSON_QUOTE({{PROVIDER_BRAND}}), 'Provider brand used in generated config files.', NOW(), NOW()),
('PROVIDER_WEBSITE', JSON_QUOTE({{PROVIDER_WEBSITE}}), 'Provider website used in generated config files.', NOW(), NOW()),
('PROVIDER_CONTACT', JSON_QUOTE({{PROVIDER_CONTACT}}), 'Provider contact used in generated config files.', NOW(), NOW()),
('PROVIDER_NOTE', JSON_QUOTE({{PROVIDER_NOTE}}), 'Provider note used in generated config files.', NOW(), NOW())
ON DUPLICATE KEY UPDATE
  setting_value = VALUES(setting_value),
  description = VALUES(description),
  updated_at = NOW();
