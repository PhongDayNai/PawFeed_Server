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
    'configFileTtlSec', 1800,
    'defaultTimezone', 'Asia/Bangkok',
    'defaultTimezoneOffsetSec', 25200,
    'defaultKeepSetupApEnabled', FALSE,
    'defaultMqttUseTls', FALSE
  ),
  'Default values used while generating config files and setup screens.',
  NOW(),
  NOW()
),
(
  'provider',
  JSON_OBJECT(
    'name', 'Phong Dương Hùng',
    'brand', 'Pet Feeder IoT',
    'website', 'https://your-domain.com',
    'contact', 'your-email@example.com',
    'note', 'Thiết bị và file cấu hình được cung cấp bởi Phong Dương Hùng.'
  ),
  'Provider info included in generated config files.',
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  setting_value = VALUES(setting_value),
  description = VALUES(description),
  updated_at = NOW();
