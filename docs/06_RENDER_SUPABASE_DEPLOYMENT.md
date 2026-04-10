# Render + Supabase Deployment Guide

This guide lets you deploy the backend now, even without ESP32 hardware.

## 1. Create Supabase Project

1. Create a new Supabase project.
2. Open SQL Editor.
3. Run the schema from:
   - `database/schema.sql`
4. Get your Postgres connection string (`DATABASE_URL`).

## 2. Deploy Blueprint on Render (Backend + Dashboard)

1. Push this repo to GitHub.
2. In Render, create a **Blueprint** and select this repo.
3. Render reads `render.yaml` automatically.
4. Set required secret env var for backend:
   - `DATABASE_URL` = your Supabase Postgres URL
5. Deploy Blueprint.

Your backend base URL will look like:
- `https://iot-energy-monitor-api.onrender.com`

Your dashboard URL will look like:
- `https://iot-energy-monitor-dashboard.onrender.com`

The dashboard service automatically points to the backend service URL via `API_BASE`.

## 3. Validate Deployment Without Hardware

Use the simulator script:

```bash
./scripts/test_ingest.sh https://YOUR_RENDER_URL
```

Then verify:
- `GET /health`
- `GET /api/readings?limit=20`
- `GET /api/alerts?limit=20`
- `GET /api/summary?windowMinutes=60`

## 4. Open Live Dashboard

After deploy, open your Render static site URL:
- `https://iot-energy-monitor-dashboard.onrender.com`

## 5. Connect ESP32 Later

When hardware arrives:
1. Copy `firmware/esp32/config.example.h` to `config.h`.
2. Set `API_ENDPOINT` to:
   - `https://YOUR_RENDER_URL/api/readings`
3. Upload firmware and confirm live updates.

## 6. Manual Database Backup

Use the included backup script before your free-tier database expires or before migrating to a new Supabase project.

1. Install PostgreSQL client tools so `pg_dump` is available.
2. Ensure `DATABASE_URL` is set, or store it in `backend/.env`.
3. Run:

```bash
bash ./scripts/backup_database.sh
```

4. The SQL dump is written to:
   - `archive/database_backups/`

Optional custom output folder:

```bash
bash ./scripts/backup_database.sh /path/to/backup-folder
```

## 7. Restore Database to a New Supabase Project

1. Create the new Supabase project.
2. Copy its Postgres connection string into `DATABASE_URL`.
3. Restore the latest backup:

```bash
psql "$DATABASE_URL" < archive/database_backups/<your-backup-file>.sql
```

4. Update Render API environment variables with the new `DATABASE_URL`.
5. Redeploy the API service.
6. Validate:
   - `GET /health`
   - `GET /health/db`
   - `GET /api/readings?limit=20`

## 8. Render Backup Checklist

`render.yaml` already preserves the repo-side service definition for:
- service names
- root directories
- build/start commands
- route rewrites
- dashboard-to-API environment wiring

Because Render secrets and some live settings are not stored in git, keep a manual backup of:
- `DATABASE_URL`
- `DB_SSL`
- any manually overridden `VITE_API_BASE`
- the Render service URLs
- custom domains, branch settings, and any dashboard-side overrides made after the Blueprint deploy

To recover Render services after a free-tier reset or accidental deletion:

1. Restore this repo with `render.yaml` intact.
2. Recreate the Blueprint in Render.
3. Re-enter required secret environment variables.
4. Point the API service to the restored database.
5. Redeploy both services.
6. Recheck dashboard and API health endpoints.

## Notes

1. Render free web services can sleep when idle (cold start on first request).
2. Supabase free projects may pause after long inactivity.
3. For best reliability during final testing/defense, keep steady traffic or upgrade plans.
