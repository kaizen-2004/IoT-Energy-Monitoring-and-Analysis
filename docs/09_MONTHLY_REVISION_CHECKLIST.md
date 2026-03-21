# Monthly Revision Checklist

This checklist covers the new monthly dashboard model, historical monthly rates, and hybrid rate draft fetch.

## 1) Database Migration

Run updated schema in Supabase SQL Editor:

- `database/schema.sql`

New table added:

- `monthly_rates`

## 2) New/Updated Backend API

- `GET /api/settings`
- `PUT /api/settings`
- `GET /api/rates?limit=240`
- `PUT /api/rates/:month` (month format: `YYYY-MM`)
- `DELETE /api/rates/:month`
- `POST /api/rates/fetch-draft`

## 3) Monthly Rate Management (Manual Authority)

Example save rate:

```bash
API_URL="https://iot-energy-monitor-api.onrender.com"
curl -X PUT "$API_URL/api/rates/2026-03" \
  -H "Content-Type: application/json" \
  -d '{"ratePerKwh":13.81,"source":"manual","verified":true}'
```

List rate history:

```bash
curl "$API_URL/api/rates?limit=60"
```

Delete month rate:

```bash
curl -X DELETE "$API_URL/api/rates/2026-03"
```

## 4) Hybrid Fetch Draft (Needs Manual Confirmation)

Fetch draft candidates from a Meralco page:

```bash
curl -X POST "$API_URL/api/rates/fetch-draft" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://company.meralco.com.ph/news-and-advisories/higher-residential-rates-march-2026","month":"2026-03"}'
```

This does **not** auto-save rate. It only returns candidates/recommended value.

## 5) Dashboard/Reports Behavior

- Month selector (`YYYY-MM`) is now primary filter.
- Chart displays daily values for selected month.
- Series: Node 1/2/3 + total line.
- KPIs are for selected month:
  - Total kWh
  - Total cost
- Insight compares selected month vs previous full month.
- Reports/PDF follow selected month filter.

## 6) Frontend Build

```bash
cd UI
npm run build
```

## 7) Deployment

Push changes to GitHub.

- Render backend redeploys from `backend/`
- Render dashboard redeploys from `UI/`

After deploy, validate:

```bash
curl "$API_URL/health"
curl "$API_URL/health/db"
curl "$API_URL/api/settings"
curl "$API_URL/api/rates?limit=60"
```
