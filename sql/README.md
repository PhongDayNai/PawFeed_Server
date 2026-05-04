# SQL — Phase 1

Thư mục này chứa migration và seed cho backend Pet Feeder IoT.

## Migrations

Chạy toàn bộ migration:

```bash
npm run db:migrate
```

Các migration hiện có:

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

Script migrate tự tạo bảng `schema_migrations` để theo dõi migration đã chạy.

## Seeds

Chạy seed:

```bash
npm run db:seed
```

Seed hiện có:

```text
seed_admin.sql
seed_mqtt_server.sql
seed_demo_device.sql
seed_system_settings.sql
```

`seed_admin.sql` có placeholder. Script `npm run db:seed` sẽ tự hash `SEED_ADMIN_PASSWORD` bằng `bcryptjs` rồi thay vào SQL trước khi chạy.

## Reset DB dev

Để reset nhanh database dev:

```bash
DB_ALLOW_RESET=true npm run db:reset -- --force
```

Hoặc sửa trong `.env`:

```env
DB_ALLOW_RESET=true
```

Rồi chạy:

```bash
npm run db:reset -- --force
```

Lưu ý: script sẽ từ chối reset nếu `NODE_ENV=production`.
