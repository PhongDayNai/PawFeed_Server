# Pet Feeder Server

Backend API server for the Pet Feeder IoT system.

The server is built with Node.js and Express. It provides application bootstrapping, request security middleware, CORS, JSON error responses, rate limiting, and health checks. Docker Compose can run the API server together with a MySQL container for local or server deployment.

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
- Docker runtime for the API server.
- Docker Compose setup for the API server and MySQL.

## Tech Stack

- Node.js 20+
- Express 4
- MySQL 8.4 container for deployment/runtime infrastructure
- Docker and Docker Compose

The project includes the `mysql2` package, but the current application code does not open a database connection yet. The Compose database service is ready for the next API/database implementation work.

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
│   └── check-health.mjs
└── src/
    ├── app.js
    ├── server.js
    ├── config/
    │   └── env.js
    ├── controllers/
    │   └── health.controller.js
    ├── middleware/
    │   ├── errorHandler.js
    │   ├── notFound.js
    │   └── rateLimits.js
    ├── routes/
    │   ├── dev.routes.js
    │   └── health.routes.js
    └── utils/
        ├── asyncHandler.js
        ├── errors.js
        └── response.js
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
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`: database connection settings reserved for app database integration.

Change all default MySQL passwords before running this on a shared machine or production server.

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

Check container status:

```bash
docker compose ps
```

Check the API health endpoint:

```bash
curl http://localhost:3000/api/health
```

MySQL is exposed only on `127.0.0.1:${MYSQL_PORT:-3306}` on the host. The API server connects to it through the internal Docker network with `DB_HOST=db`.

Stop the containers:

```bash
docker compose down
```

Stop the containers and remove the MySQL volume:

```bash
docker compose down -v
```

Use `docker compose down -v` only when you intentionally want to delete local database data.

## API Endpoints

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
- `npm run check`: run Node.js syntax checks for the main server files.
- `npm run health`: call the local health endpoint.

## Database Status

Docker Compose starts a MySQL 8.4 container with persistent storage in the `mysql_data` volume. The current API code does not create tables, run migrations, seed data, or query MySQL yet.

When database-backed features are added, the application should add a database config module, migrations, seed scripts, and DB-aware health checks.
