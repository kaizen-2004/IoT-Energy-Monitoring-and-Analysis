# Next Agent Handoff (2026-03-21)

This file captures the current working context for the IoT Energy Monitoring project.

## 1) Source Of Truth + Scope

- Primary requirements source: `IoT Energy Monitoring and Analysis - Revised.md`
- Project direction being followed:
  - 3 appliance nodes (ESP32-based, non-invasive current sensing)
  - Cloud-backed data ingestion + web dashboard
  - Philippine context, kWh-centric reporting, threshold alerts
  - Settings for monthly electricity rate and node labeling
- Protocol decision for this implementation: `HTTP` (not MQTT) to match project direction and current stack.

## 2) Current Architecture

- Firmware (`firmware/esp32`):
  - ESP32 posts readings to backend `POST /api/readings` over HTTP.
- Backend (`backend`, Node/Express):
  - Provides health + readings + alerts + summary + settings APIs.
  - Uses Supabase/Postgres via `DATABASE_URL`.
- Dashboard (`UI`, React + Vite):
  - Reads backend via `VITE_API_BASE` (Render injects this from backend URL).
  - Pages: Dashboard, Settings, Reports.
  - Includes dark/light mode and PDF export.

## 3) Live Deployment State (Render + Supabase)

- Backend URL:
  - `https://iot-energy-monitor-api.onrender.com`
- Dashboard URL (Render static service):
  - `https://iot-energy-monitor-dashboard.onrender.com`
- Health checks:
  - `GET /health` is intentionally app-only and should return fast.
  - `GET /health/db` verifies DB connectivity + row count.
- Note:
  - `GET /` on backend returns `{"message":"Not found"}` by design (no root route).

## 4) Backend/API Status

### Endpoints

- `GET /health`
- `GET /health/db`
- `GET /api/settings`
- `PUT /api/settings`
- `POST /api/readings`
- `GET /api/readings?limit=...&applianceId=...`
- `GET /api/alerts?limit=...`
- `GET /api/summary?windowMinutes=...`

### Reading payload requirements (`POST /api/readings`)

Required fields:
- `nodeId` (string)
- `applianceId` (string)
- `applianceName` (string)
- `currentRmsA` (number)
- `voltageRefV` (number)
- `powerW` (number)
- `thresholdW` (number)

Optional:
- `energyWh`, `frequencyHz`, `abnormal`, `timestamp`, `timestampMs`

### Settings persistence

- Backend persists app settings in `app_settings` table (created automatically if missing):
  - `electricityRate`
  - `effectiveMonth`
  - `nodeLabels`
  - `nodeThresholds`
  - `timezone`
- Verified example response:
  - `GET /api/settings` returned persisted values (rate/month/labels/thresholds/timezone).

## 5) Dashboard/UI State

- Main title currently:
  - `IoT Household Energy Monitoring Dashboard`
- Navbar:
  - Dashboard / Settings / Reports / Dark-Light toggle
- Dashboard:
  - Total today kWh, yesterday kWh, estimated cost, insight message
  - Node cards (3 nodes)
  - 7-day chart uses `ComposedChart` (grouped bars per node + total trend line)
  - Alerts list
- Settings:
  - Billing section with monthly rate input (with unit suffix) and effective month
  - Effective month supports native `type="month"` when available, fallback selectors otherwise
  - Node labels and thresholds
  - Timezone + appearance/API info
- Reports:
  - PDF export implemented with jsPDF and custom styled summary sections
  - Previous `oklch` parsing issue was addressed by drawing chart natively in jsPDF instead of html2canvas capture of CSS colors

## 6) Known Issues / Gotchas Already Encountered

- Shell command formatting:
  - If URL is placed on a new line incorrectly, shell interprets it as a file/path and fails.
  - Always run scripts as one command line:
    - `./scripts/test_ingest.sh https://iot-energy-monitor-api.onrender.com`
- If `API_URL` is unset:
  - `curl "$API_URL/..."` fails with `No host part in the URL`.
- Backend root URL:
  - `https://iot-energy-monitor-api.onrender.com/` returning `Not found` is expected.
- Data consistency:
  - Test data includes mixed labels (`Node1`, `Node 1`, `electric-fan`, etc.).
  - This can make dashboard grouping/legend labels look inconsistent.
  - Recommended canonical labels: `Node 1`, `Node 2`, `Node 3`.
- Render free tier:
  - Cold starts/sleep can delay first request.

## 7) Testing Commands That Were Used Successfully

Set API URL:

```bash
API_URL="https://iot-energy-monitor-api.onrender.com"
```

Health:

```bash
curl "$API_URL/health"
curl "$API_URL/health/db"
```

Simulate readings:

```bash
curl -X POST "$API_URL/api/readings" -H "Content-Type: application/json" -d '{"nodeId":"node-01","applianceId":"appliance-01","applianceName":"Node 1","currentRmsA":1.2,"voltageRefV":230,"powerW":280,"thresholdW":250,"abnormal":true,"timestamp":"2026-03-21T10:00:00+08:00"}'
curl -X POST "$API_URL/api/readings" -H "Content-Type: application/json" -d '{"nodeId":"node-02","applianceId":"appliance-02","applianceName":"Node 2","currentRmsA":2.8,"voltageRefV":230,"powerW":644,"thresholdW":1200,"abnormal":false,"timestamp":"2026-03-21T10:01:00+08:00"}'
curl -X POST "$API_URL/api/readings" -H "Content-Type: application/json" -d '{"nodeId":"node-03","applianceId":"appliance-03","applianceName":"Node 3","currentRmsA":0.9,"voltageRefV":230,"powerW":207,"thresholdW":300,"abnormal":false,"timestamp":"2026-03-21T10:02:00+08:00"}'
```

Read-back:

```bash
curl "$API_URL/api/readings?limit=20"
curl "$API_URL/api/alerts?limit=20"
curl "$API_URL/api/summary?windowMinutes=1440"
```

Existing scripted test:

```bash
./scripts/test_ingest.sh "$API_URL"
```

Insight test command set is documented in:
- `docs/07_INSIGHT_TEST_COMMANDS.md`

## 8) Hardware Status + Prep

- User does not yet have physical ESP32 hardware.
- Firmware prep work added:
  - `firmware/esp32/config.node-01.example.h`
  - `firmware/esp32/config.node-02.example.h`
  - `firmware/esp32/config.node-03.example.h`
  - `firmware/esp32/use_node_config.sh`
- `config.h` is git-ignored to avoid committing credentials.

Recommended node mapping:
- `node-01` -> `appliance-01` -> `Node 1`
- `node-02` -> `appliance-02` -> `Node 2`
- `node-03` -> `appliance-03` -> `Node 3`

## 9) Security/Secret Handling Notes

- A `.env` was accidentally pushed earlier in the session history.
- A cleanup commit/deploy flow was performed afterwards.
- Still recommended:
  - Rotate DB credentials (Supabase DB password / connection string) if not already rotated.
  - Keep `.env` out of git permanently.

## 10) Current Git Working Tree Snapshot

At time of writing, these local changes are present and not yet committed:

- Modified:
  - `.gitignore`
  - `firmware/esp32/README.md`
- New:
  - `firmware/esp32/config.node-01.example.h`
  - `firmware/esp32/config.node-02.example.h`
  - `firmware/esp32/config.node-03.example.h`
  - `firmware/esp32/use_node_config.sh`

## 11) Recommended Next Steps For Next Agent

1. Confirm current UI status in browser (Dashboard + Settings + Reports on desktop/mobile).
2. Normalize label conventions in test data (or clear historical test rows if needed).
3. If user wants cleaner data:
   - run `TRUNCATE TABLE readings RESTART IDENTITY;` in Supabase SQL Editor, then reseed sample readings.
4. Finalize ESP32 firmware calibration placeholders once hardware arrives.
5. Begin Phase 5 measurement validation (mean/std dev/% error vs clamp meter) when hardware testing starts.

