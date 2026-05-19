CREATE TABLE IF NOT EXISTS refresh_token_denylist (
  jti VARCHAR(36) PRIMARY KEY,
  revoked_at DATETIME NOT NULL DEFAULT NOW(),
  INDEX idx_denylist_revoked_at (revoked_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
