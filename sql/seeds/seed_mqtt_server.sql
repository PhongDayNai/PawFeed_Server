INSERT INTO mqtt_servers (
  name,
  host,
  mqtt_port,
  tls_port,
  websocket_port,
  use_tls,
  is_active,
  created_at,
  updated_at
) VALUES (
  {{MQTT_SERVER_NAME}},
  {{MQTT_HOST}},
  {{MQTT_PORT}},
  {{MQTT_TLS_PORT}},
  {{MQTT_WEBSOCKET_PORT}},
  {{MQTT_USE_TLS}},
  TRUE,
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  host = VALUES(host),
  mqtt_port = VALUES(mqtt_port),
  tls_port = VALUES(tls_port),
  websocket_port = VALUES(websocket_port),
  use_tls = VALUES(use_tls),
  is_active = TRUE,
  updated_at = NOW();
