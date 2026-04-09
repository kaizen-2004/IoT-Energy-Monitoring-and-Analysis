# Backend API Starter

Node.js/Express starter backend for:
- Receiving ESP32 readings
- Serving dashboard queries
- Providing summary/alert endpoints
- Persisting readings in PostgreSQL (Supabase compatible)

## Endpoints

- `GET /health`
- `GET /health/db`
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

`GET /api/alerts` now reports a combined alert only when the total live load of
`appliance-01`, `appliance-02`, and `appliance-03` exceeds the total configured
threshold from `app_settings.node_thresholds`.

## Run

```bash
npm install
npm run dev
```

Before running, create `.env` from `.env.example` and set:
- `DATABASE_URL`
- `DB_SSL` (usually `true` for Supabase)

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
