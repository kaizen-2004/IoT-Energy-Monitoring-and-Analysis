# Backend API Starter

Node.js/Express starter backend for:
- Receiving ESP32 readings
- Serving dashboard queries
- Providing summary/alert endpoints
- Persisting readings in PostgreSQL (Supabase compatible)

## Endpoints

- `GET /health`
- `GET /health/db`
- `GET /api/auth/status`
- `POST /api/auth/setup`
- `POST /api/auth/can`
- `PUT /api/auth/can`
- `GET /api/settings`
- `PUT /api/settings`
- `GET /api/rates?limit=240`
- `PUT /api/rates/:month` (`YYYY-MM`)
- `DELETE /api/rates/:month` (`YYYY-MM`)
- `POST /api/rates/fetch-draft`
- `POST /api/readings`
- `GET /api/readings?limit=120&applianceId=appliance-01`
- `GET /api/summary?windowMinutes=60`
- `GET /api/alerts?limit=50`

`GET /api/alerts` reports per-appliance monthly limit alerts when the current
month's calculated kWh exceeds that appliance's configured limit from
`app_settings.node_monthly_limits_kwh`. A `0` limit disables alerts for that
appliance.

## Run

```bash
npm install
npm run dev
```

Before running, create `.env` from `.env.example` and set:
- `DATABASE_URL`
- `DB_SSL` (usually `true` for Supabase)

The Customer Account Number is configured inside the web app during first setup and stored as a backend hash in `app_settings`.

```bash
cp .env.example .env
npm run dev
```

Default URL: `http://localhost:8080`

## Database Setup

1. Create your Supabase project.
2. Run the SQL schema at `../database/schema.sql`.
3. Paste your Postgres connection string into `DATABASE_URL`.

The API now writes and reads directly from PostgreSQL.
