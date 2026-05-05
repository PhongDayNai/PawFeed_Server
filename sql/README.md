# SQL - Pet Feeder Server

This directory contains database migrations and seed files for the Pet Feeder server.

## Migrations

```text
001_create_users.sql
002_create_devices.sql
003_create_mqtt.sql
004_create_current_configs.sql
005_create_schedules.sql
006_create_config_generations.sql
007_create_commands_events_histories.sql
008_create_system_settings.sql
009_create_audit_logs.sql
010_add_device_display_name.sql
```

## User Auth Fields

```text
id
full_name
email
password_hash
role
is_disabled
created_at
updated_at
```

Supported roles:

```text
user
admin
technician
```

`is_disabled = TRUE` blocks login and also blocks previously issued Bearer tokens in the authentication middleware.

## Device Ownership

The `devices` table stores factory identifiers, claim codes, owner assignment, device secrets, firmware metadata, status, and optional user-facing `display_name`.

User device linking uses:

```text
machine_code
claim_code
owner_user_id
claim_code_used_at
```

Link attempts and unlink actions are recorded in `device_link_histories`.

## Seeds

```text
seed_admin.sql
seed_mqtt_server.sql
seed_demo_device.sql
seed_system_settings.sql
```

Default admin seed:

```text
email: admin@example.com
password: Admin@123456
role: admin
```

The admin password is hashed by `npm run db:seed`; plaintext is not stored in the database.
