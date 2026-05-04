INSERT INTO users (
  full_name,
  email,
  password_hash,
  role,
  is_disabled,
  created_at,
  updated_at
) VALUES (
  {{ADMIN_FULL_NAME}},
  {{ADMIN_EMAIL}},
  {{ADMIN_PASSWORD_HASH}},
  'admin',
  FALSE,
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  full_name = VALUES(full_name),
  password_hash = VALUES(password_hash),
  role = 'admin',
  is_disabled = FALSE,
  updated_at = NOW();
