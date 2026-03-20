# Render + Supabase Deployment Guide

This guide lets you deploy the backend now, even without ESP32 hardware.

## 1. Create Supabase Project

1. Create a new Supabase project.
2. Open SQL Editor.
3. Run the schema from:
   - `database/schema.sql`
4. Get your Postgres connection string (`DATABASE_URL`).

## 2. Deploy Backend on Render (Free Web Service)

1. Push this repo to GitHub.
2. In Render, create a **Blueprint** and select this repo.
3. Render reads `render.yaml` automatically.
4. Set required secret env var:
   - `DATABASE_URL` = your Supabase Postgres URL
5. Deploy service.

Your backend base URL will look like:
- `https://iot-energy-monitor-api.onrender.com`

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

## 4. Connect Dashboard

Update:
- `dashboard/app.js`
- Set `API_BASE` to your Render backend URL

Serve dashboard locally:

```bash
cd dashboard
python3 -m http.server 5500
```

## 5. Connect ESP32 Later

When hardware arrives:
1. Copy `firmware/esp32/config.example.h` to `config.h`.
2. Set `API_ENDPOINT` to:
   - `https://YOUR_RENDER_URL/api/readings`
3. Upload firmware and confirm live updates.

## Notes

1. Render free web services can sleep when idle (cold start on first request).
2. Supabase free projects may pause after long inactivity.
3. For best reliability during final testing/defense, keep steady traffic or upgrade plans.

