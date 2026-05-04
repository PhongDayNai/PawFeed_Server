CREATE TABLE IF NOT EXISTS mqtt_servers (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  host VARCHAR(255) NOT NULL,
  mqtt_port INT DEFAULT 1883,
  tls_port INT DEFAULT 8883,
  websocket_port INT NULL,
  use_tls BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NULL,
  UNIQUE KEY uq_mqtt_servers_name (name),
  INDEX idx_mqtt_servers_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS device_mqtt_credentials (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  device_id BIGINT NOT NULL,
  mqtt_server_id BIGINT NOT NULL,
  mqtt_username VARCHAR(150) UNIQUE NOT NULL,
  mqtt_password TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NULL,
  CONSTRAINT fk_device_mqtt_credentials_device_id FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
  CONSTRAINT fk_device_mqtt_credentials_mqtt_server_id FOREIGN KEY (mqtt_server_id) REFERENCES mqtt_servers(id) ON DELETE RESTRICT,
  INDEX idx_device_mqtt_credentials_device_id (device_id),
  INDEX idx_device_mqtt_credentials_mqtt_server_id (mqtt_server_id),
  INDEX idx_device_mqtt_credentials_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
