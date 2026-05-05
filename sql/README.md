# SQL — Pet Feeder Server

Phase 1 tạo nền database và Phase 2 sử dụng bảng `users` để triển khai Auth.

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
```

## Auth fields trong bảng users

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

Role hiện hỗ trợ:

```text
user
admin
technician
```

`is_disabled = TRUE` sẽ chặn login và chặn cả Bearer token cũ trong middleware `authenticate`.

## Seeds

```text
seed_admin.sql
seed_mqtt_server.sql
seed_demo_device.sql
seed_system_settings.sql
```

Admin seed mặc định:

```text
email: admin@example.com
password: Admin@123456
role: admin
```

Password được hash trong script `npm run db:seed`, không lưu plaintext vào database.
