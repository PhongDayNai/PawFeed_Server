# Pet Feeder Server

Backend API server and database bootstrap tooling for the Pet Feeder IoT system.

The server is built with Node.js and Express. It provides the base HTTP API runtime, standard JSON responses, middleware, health checks, and database migration/seed scripts for a MySQL-backed Pet Feeder deployment. Docker Compose can run the API server and MySQL together for local development or server deployment.

## Features

- Express server with JSON and URL-encoded request parsing.
- Environment configuration loaded from `.env`.
- Security headers with `helmet`.
- CORS configuration through `CORS_ORIGIN`.
- Request logging with `morgan`.
- Rate limiting for `/api/*` routes.
- Health check endpoint: `GET /api/health`.
- Standard JSON response helpers.
- Standard JSON 404 and error handling.
- Optional development-only error route for testing error responses.
- MySQL connection configuration with `mysql2`.
- SQL migration runner with checksum tracking.
- SQL seed runner for admin user, MQTT server, demo device, and system settings.
- Docker runtime for the API server.
- Docker Compose setup for the API server and MySQL.

## Tech Stack

- Node.js 20+
- Express 4
- MySQL 8.4
- Docker and Docker Compose

## Project Structure

```text
pet-feeder-server/
├── Dockerfile
├── docker-compose.yml
├── package.json
├── .env
├── .env.example
├── README.md
├── scripts/
│   ├── check-health.mjs
│   ├── db.migrate.mjs
│   ├── db.reset.mjs
│   ├── db.seed.mjs
│   ├── db.status.mjs
│   └── db/
│       └── common.mjs
├── sql/
│   ├── migrations/
│   └── seeds/
└── src/
    ├── app.js
    ├── server.js
    ├── config/
    │   ├── db.js
    │   └── env.js
    ├── controllers/
    ├── middleware/
    ├── routes/
    └── utils/
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
- `SEED_*`: seed data for the initial admin account, MQTT server, and demo device.

Change all default MySQL, admin, and demo-device passwords before running this on a shared machine or production server.

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

## API Endpoints

### Root

```bash
curl http://localhost:3000/
```

### Health Check

```bash
curl http://localhost:3000/api/health
```

Example response:

```json
{
  "ok": true,
  "service": "pet-feeder-server",
  "version": "4.1",
  "environment": "development",
  "uptimeSec": 10,
  "timestamp": "2026-05-04T00:00:00.000Z"
}
```

You can also run the health check script after the server is running:

```bash
npm run health
```

### Not Found Response

```bash
curl http://localhost:3000/api/unknown
```

Example response:

```json
{
  "ok": false,
  "error": {
    "code": "ROUTE_NOT_FOUND",
    "message": "Cannot GET /api/unknown"
  }
}
```

### Development Error Response

Enable the development error route in `.env`:

```env
ENABLE_DEV_ERROR_ROUTE=true
```

Restart the server and call:

```bash
curl http://localhost:3000/api/dev/error
```

This route is disabled in production.

## Scripts

- `npm start`: start the server with Node.js.
- `npm run dev`: start the server with Nodemon.
- `npm run check`: run Node.js syntax checks for the server and database scripts.
- `npm run health`: call the local health endpoint.
- `npm run db:status`: show migration and table status.
- `npm run db:migrate`: apply pending SQL migrations.
- `npm run db:seed`: apply SQL seed data.
- `npm run db:reset`: drop and rebuild a non-production database when explicitly allowed.
