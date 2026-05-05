# Pet Feeder Server

Backend API server and database tooling for the Pet Feeder IoT system.

The service runs an Express API backed by MySQL. It provides authentication, account management, admin-only device provisioning, pairing-code and QR payload generation, user device ownership, current device configuration, signed config file generation, feeding schedule storage, MQTT credential storage, health checks, and database migration/seed scripts.

## Features

- Express API runtime with JSON request parsing, CORS, Helmet, request logging, and rate limiting.
- Standard JSON success and error responses.
- Shared response helpers, pagination metadata, and structured validation errors.
- Health check endpoint: `GET /api/health`.
- MySQL connection pooling with `mysql2/promise`.
- SQL migration, seed, reset, and status scripts.
- JWT authentication with access and refresh tokens.
- User registration, login, logout, refresh, current-user, password-change, and profile-update APIs.
- Role-based admin routes.
- Admin device provisioning APIs.
- User device linking and ownership APIs.
- User-managed current device configuration APIs for Wi-Fi, location, timezone, and setup AP settings.
- Feeding schedule storage with strict time validation, duration limits, and apply-status reporting.
- HMAC-signed device config file generation and generation history APIs.
- Machine compatibility tooling for config-file signing payload inspection and comparison.
- Optional MQTT connection service with default subscriptions for device online, state, telemetry, event, and ack topics.
- MQTT inbound handlers that update device status, telemetry timestamps, events, command acknowledgements, config apply status, and feeding history.
- Remote feed-now command APIs with user command status lookup and admin command history filtering.
- Optional background workers for command timeouts and stale-device offline detection.
- User and admin operation log APIs for device events, feeding history, and config generation history.
- User dashboard summary API and paginated device listing with filters.
- Full admin management APIs for dashboard, users, devices, MQTT servers, credentials, system settings, and audit logs.
- Admin MQTT connection testing and safer MQTT credential/device secret rotation flows.
- Runtime system settings for provider metadata, config defaults, and worker timeout values.
- Automatic generation of device IDs, machine codes, pairing codes, device secrets, and MQTT credentials.
- Device QR payload generation.
- Pairing-code rotation.
- User-facing device rename support.
- Audit logs for admin device operations.
- Docker and Docker Compose runtime for local development and deployment testing.

## Tech Stack

- Node.js 20+
- Express 4
- MySQL 8.4
- Docker and Docker Compose
- JWT
- Zod
- MQTT client library

## Project Structure

```text
pet-feeder-server/
├── Dockerfile
├── docker-compose.yml
├── package.json
├── scripts/
│   ├── check-health.mjs
│   ├── db.migrate.mjs
│   ├── db.reset.mjs
│   ├── db.seed.mjs
│   ├── db.status.mjs
│   └── db/
├── sql/
│   ├── migrations/
│   └── seeds/
└── src/
    ├── app.js
    ├── server.js
    ├── config/
    ├── controllers/
    ├── middleware/
    ├── routes/
    ├── services/
    ├── utils/
    └── validators/
```

## Environment

Create a local environment file:

```bash
cp .env.example .env
```

Important variables:

- `NODE_ENV`: runtime environment, for example `development` or `production`.
- `APP_NAME`: service name returned by health checks.
- `APP_VERSION`: service version returned by health checks.
- `PORT`: internal API server port.
- `HOST`: bind address. Use `0.0.0.0` inside Docker.
- `CORS_ORIGIN`: `*` or a comma-separated list of allowed origins.
- `JSON_BODY_LIMIT`: Express JSON body size limit.
- `RATE_LIMIT_WINDOW_MS`: rate limit window for `/api/*`.
- `RATE_LIMIT_MAX`: max requests per rate limit window.
- `ENABLE_DEV_ERROR_ROUTE`: enables `GET /api/dev/error` outside production.
- `APP_PORT`: public host port used by Docker Compose for the API server.
- `MYSQL_PORT`: localhost-only host port used by Docker Compose for MySQL.
- `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`: MySQL container settings.
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`: app database connection settings.
- `DB_CONNECTION_LIMIT`: MySQL pool connection limit.
- `DB_SSL`: enables SSL for app database connections.
- `DB_ALLOW_RESET`: required before `npm run db:reset -- --force` can reset a non-production database.
- `CONFIG_FILE_TTL_SEC`: generated config file lifetime in seconds.
- `DEFAULT_TIMEZONE`, `DEFAULT_TIMEZONE_OFFSET_SEC`, `DEFAULT_KEEP_SETUP_AP_ENABLED`: defaults used when generating config files.
- `PROVIDER_NAME`, `PROVIDER_BRAND`, `PROVIDER_WEBSITE`, `PROVIDER_CONTACT`, `PROVIDER_NOTE`: provider metadata included in generated config files.
- `MQTT_ENABLED`: enables the server-side MQTT connection service.
- `MQTT_BROKER_HOST`, `MQTT_BROKER_PORT`, `MQTT_BROKER_USE_TLS`: broker connection settings.
- `MQTT_SERVICE_USERNAME`, `MQTT_SERVICE_PASSWORD`, `MQTT_CLIENT_ID`: service client credentials and identity.
- `MQTT_KEEPALIVE_SEC`, `MQTT_CONNECT_TIMEOUT_MS`, `MQTT_RECONNECT_PERIOD_MS`: MQTT connection timing settings.
- `MQTT_SUBSCRIBE_QOS`, `MQTT_PUBLISH_QOS`, `MQTT_TLS_REJECT_UNAUTHORIZED`: MQTT subscription, publish, and TLS behavior.
- `WORKERS_ENABLED`, `WORKERS_RUN_ON_START`, `WORKERS_LOG_NOOP_RUNS`: background worker runtime controls.
- `COMMAND_TIMEOUT_WORKER_ENABLED`, `COMMAND_TIMEOUT_WORKER_INTERVAL_MS`, `COMMAND_ACK_TIMEOUT_SEC`, `COMMAND_COMPLETE_TIMEOUT_SEC`: command timeout worker settings.
- `DEVICE_OFFLINE_WORKER_ENABLED`, `DEVICE_OFFLINE_WORKER_INTERVAL_MS`, `DEVICE_ONLINE_TTL_SEC`: stale-device offline worker settings.
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`: secrets used to sign access and refresh tokens.
- `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`: JWT expiration windows.
- `BCRYPT_SALT_ROUNDS`: bcrypt hashing cost for user passwords.
- `SEED_MQTT_HOST`, `SEED_MQTT_PORT`, `SEED_MQTT_TLS_PORT`, `SEED_MQTT_WEBSOCKET_PORT`: seeded MQTT broker connection metadata.
- `SEED_*`: seed data for the initial admin account, MQTT server, and demo device.

Change all default MySQL, admin, demo-device, MQTT, and JWT secret values before running this on a shared machine or production server.

## Local Development

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Run a production-style local server:

```bash
npm start
```

The API listens on `http://localhost:3000` by default.

## Docker Compose

Start the API server and MySQL:

```bash
docker compose up -d --build
```

MySQL is exposed only on `127.0.0.1:${MYSQL_PORT:-3306}` on the host. The API server connects to it through the internal Docker network with `DB_HOST=db`.

Run migrations and seeds inside the server container:

```bash
docker compose exec server npm run db:migrate
docker compose exec server npm run db:seed
```

Check container status and the API health endpoint:

```bash
docker compose ps
curl http://localhost:3000/api/health
```


```bash
npm run phase8:generate-sample
```

Stop the containers:

```bash
docker compose down
```

Stop the containers and remove the MySQL volume:

```bash
docker compose down -v
```

Use `docker compose down -v` only when you intentionally want to delete local database data.

## Database Commands

Check migration status:

```bash
npm run db:status
```

Apply pending migrations:

```bash
npm run db:migrate
```

Apply seed data:

```bash
npm run db:seed
```

Reset a non-production database:

```bash
DB_ALLOW_RESET=true npm run db:reset -- --force
```

The migration runner records executed files in `schema_migrations` with checksums. If a migration file changes after execution, the runner fails instead of silently reapplying changed SQL.

## Seed Data

Default admin account:

```text
email: admin@example.com
password: Admin@123456
```

Default demo device:

```text
deviceId: feeder001
machineCode: PF-ESP8266-001
pairingCode: A8K2-91PQ
deviceSecret: CHANGE_ME_DEVICE_SECRET
mqttUsername: feeder001
mqttPassword: feeder001_dev_password
```

Default MQTT server metadata:

```text
name: local-broker
host: 127.0.0.1
mqttPort: 1883
tlsPort: 8883
websocketPort: 9001
useTls: false
```

The backend stores MQTT credentials in MySQL. It does not automatically create users in Mosquitto. If the broker requires username/password authentication, create or sync the same MQTT accounts on the broker before testing device connections.

## API Endpoints

### Health

```bash
curl http://localhost:3000/api/health
```

### Authentication

Register a user:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test User",
    "email": "user@example.com",
    "password": "User@123456"
  }'
```

Log in with the seeded admin account:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Admin@123456"
  }'
```

Use the returned access token for protected APIs:

```bash
TOKEN="YOUR_ACCESS_TOKEN"
```

Get the current user:

```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

Refresh tokens:

```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

Log out:

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer $TOKEN"
```

Change password:

```bash
curl -X POST http://localhost:3000/api/auth/change-password \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "OldPassword@123",
    "newPassword": "NewPassword@123"
  }'
```

### Account

Update profile:

```bash
curl -X PATCH http://localhost:3000/api/account/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Updated Name"
  }'
```

### Admin

Check admin access:

```bash
curl http://localhost:3000/api/admin/ping \
  -H "Authorization: Bearer $TOKEN"
```

Create a device with generated values:

```bash
curl -X POST http://localhost:3000/api/admin/devices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firmwareVersion": "1.0.0-dev"
  }'
```

Create a device with explicit values:

```bash
curl -X POST http://localhost:3000/api/admin/devices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "feeder002",
    "machineCode": "PF-ESP8266-002",
    "pairingCode": "B7K2-91PQ",
    "deviceSecret": "CHANGE_ME_DEVICE_SECRET",
    "firmwareVersion": "1.0.0-dev",
    "mqttUsername": "feeder002",
    "mqttPassword": "feeder002_dev_password"
  }'
```

List devices:

```bash
curl http://localhost:3000/api/admin/devices \
  -H "Authorization: Bearer $TOKEN"
```

Filter devices:

```bash
curl "http://localhost:3000/api/admin/devices?q=PF-ESP8266&page=1&limit=20" \
  -H "Authorization: Bearer $TOKEN"
```

Get device detail:

```bash
curl http://localhost:3000/api/admin/devices/feeder001 \
  -H "Authorization: Bearer $TOKEN"
```

Get QR payload:

```bash
curl http://localhost:3000/api/admin/devices/feeder001/qr \
  -H "Authorization: Bearer $TOKEN"
```

Get pairing-code status:

```bash
curl http://localhost:3000/api/admin/devices/feeder001/pairing-code/status \
  -H "Authorization: Bearer $TOKEN"
```

Rotate pairing code:

```bash
curl -X POST http://localhost:3000/api/admin/devices/feeder001/rotate-pairing-code \
  -H "Authorization: Bearer $TOKEN"
```

Admin list and detail responses mask pairing codes and MQTT passwords. Device secrets are not returned by the admin list/detail, QR, or status endpoints.

### User Devices

Link a device to the authenticated user:

```bash
curl -X POST http://localhost:3000/api/devices/link \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "machineCode": "PF-ESP8266-001",
    "pairingCode": "A8K2-91PQ"
  }'
```

List linked devices:

```bash
curl http://localhost:3000/api/devices \
  -H "Authorization: Bearer $TOKEN"
```

Get linked device detail:

```bash
curl http://localhost:3000/api/devices/feeder001 \
  -H "Authorization: Bearer $TOKEN"
```

Get latest device status:

```bash
curl http://localhost:3000/api/devices/feeder001/status \
  -H "Authorization: Bearer $TOKEN"
```

Get current device configuration:

```bash
curl http://localhost:3000/api/devices/feeder001/current-config \
  -H "Authorization: Bearer $TOKEN"
```

Save current device configuration:

```bash
curl -X PUT http://localhost:3000/api/devices/feeder001/current-config \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "wifiSsid": "Home_Wifi_5G",
    "wifiPassword": "12345678",
    "address": "Kitchen",
    "addressNote": "Near the window",
    "timezone": "Asia/Bangkok",
    "timezoneOffsetSec": 25200,
    "keepSetupApEnabled": false
  }'
```

Get feeding schedule:

```bash
curl http://localhost:3000/api/devices/feeder001/schedule \
  -H "Authorization: Bearer $TOKEN"
```

Save feeding schedule:

```bash
curl -X PUT http://localhost:3000/api/devices/feeder001/schedule \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "timezone": "Asia/Bangkok",
    "timezoneOffsetSec": 25200,
    "items": [
      {
        "time": "07:00",
        "openDurationMs": 1200,
        "enabled": true
      },
      {
        "time": "18:30",
        "openDurationMs": 1500,
        "enabled": true
      }
    ]
  }'
```

Get schedule apply status:

```bash
curl http://localhost:3000/api/devices/feeder001/schedule/apply-status \
  -H "Authorization: Bearer $TOKEN"
```

Generate a signed config file and return it as JSON:

```bash
curl -X POST "http://localhost:3000/api/devices/feeder001/config-file?mode=json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "wifiSsid": "Home_Wifi_5G",
    "wifiPassword": "12345678",
    "address": "Kitchen",
    "addressNote": "Near the window",
    "timezone": "Asia/Bangkok",
    "timezoneOffsetSec": 25200,
    "keepSetupApEnabled": false,
    "feedingSchedule": {
      "enabled": true,
      "items": [
        {
          "id": "meal_1",
          "time": "07:00",
          "openDurationMs": 1200,
          "enabled": true
        }
      ]
    }
  }'
```

Download a signed config file:

```bash
curl -X POST http://localhost:3000/api/devices/feeder001/config-file \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -o feeder001 \
  -d '{
    "wifiSsid": "Home_Wifi_5G",
    "wifiPassword": "12345678",
    "feedingSchedule": {
      "enabled": true,
      "items": [
        {
          "time": "07:00",
          "openDurationMs": 1200,
          "enabled": true
        }
      ]
    }
  }'
```

Regenerate a signed config file from the saved current config and schedule:

```bash
curl -X POST "http://localhost:3000/api/devices/feeder001/config-file/regenerate?mode=json" \
  -H "Authorization: Bearer $TOKEN"
```

List generated config files:

```bash
curl "http://localhost:3000/api/devices/feeder001/config-generations?page=1&limit=20" \
  -H "Authorization: Bearer $TOKEN"
```

Rename a linked device:

```bash
curl -X PATCH http://localhost:3000/api/devices/feeder001 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "Kitchen Feeder"
  }'
```

Unlink a device:

```bash
curl -X POST http://localhost:3000/api/devices/feeder001/unlink \
  -H "Authorization: Bearer $TOKEN"
```

Only the owner can list, read, rename, get status for, or unlink a linked device. A used pairing code remains used after unlinking until an admin rotates it.

## MQTT Broker Accounts

For local broker testing, create accounts matching the device credentials stored in MySQL.

Example Mosquitto commands:

```bash
docker compose -f /path/to/mqtt-server/docker-compose.yml \
  exec -T mosquitto \
  sh -lc "mosquitto_passwd -b /mosquitto/config/passwords server 'server_strong_password' && \
          mosquitto_passwd -b /mosquitto/config/passwords feeder001 'feeder001_dev_password'"
```

Reload Mosquitto after changing the password file:

```bash
docker kill -s HUP pet-feeder-mqtt
```

If reload is not available, restart the broker container.

## Validation

Run syntax checks:

```bash
npm run check
```


```bash
```


```bash
```


```bash
```

Run a health check against a running server:

```bash
npm run health
```

## Security Notes

- Use long, random, different values for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.
- Change default seed passwords before using shared environments.
- Treat `device_secret` and `mqtt_password` as sensitive values.
- Admin APIs should be exposed only behind authenticated and authorized access.
- MQTT credentials stored in MySQL must be synced to the broker separately unless a broker-sync worker is added.
