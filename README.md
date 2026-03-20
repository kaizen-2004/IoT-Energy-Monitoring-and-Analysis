# IoT Energy Monitoring and Analysis

Repository scaffold for:
`IoT-Based Integrated Power Consumption Analysis and Monitoring Device Using WSN for Home Appliances`.

This blueprint is aligned with the source document in:
`IoT Energy Monitoring and Analysis - Revised.md`.

## Project Goal

Build a non-invasive, ESP32-based, Wi-Fi-enabled power monitoring system that:
- Measures appliance current using SCT-013-000 sensors.
- Computes estimated power using `P = V x I`.
- Sends readings to a cloud-connected backend.
- Displays real-time and historical data on a web dashboard.
- Supports threshold-based notifications and abnormal consumption detection.

## Repository Structure

```text
.
|-- README.md
|-- docs/
|   |-- 01_FIXED_REQUIREMENTS.md
|   |-- 02_DETAILED_PROJECT_PLAN.md
|   |-- 03_IMPLEMENTATION_CHECKLIST.md
|   |-- 04_ARCHITECTURE.md
|   |-- 05_DASHBOARD_IMPLEMENTATION_METHODS.md
|   |-- 06_RENDER_SUPABASE_DEPLOYMENT.md
|   `-- OPEN_ITEMS_AND_CONFLICTS.md
|-- firmware/
|   `-- esp32/
|       |-- README.md
|       |-- config.example.h
|       `-- esp32_energy_monitor.ino
|-- scripts/
|   `-- test_ingest.sh
|-- backend/
|   |-- README.md
|   |-- package.json
|   |-- .env.example
|   `-- src/
|       |-- db.js
|       |-- server.js
|       |-- store.js
|       `-- validation.js
|-- dashboard/
|   |-- README.md
|   |-- index.html
|   |-- styles.css
|   `-- app.js
|-- render.yaml
`-- database/
    |-- README.md
    `-- schema.sql
```

## Quick Start (Starter Scaffold)

1. Backend API:
```bash
cd backend
npm install
cp .env.example .env
# Edit .env and set DATABASE_URL from Supabase
npm run dev
```

2. Dashboard:
```bash
cd dashboard
python3 -m http.server 5500
```
Open `http://localhost:5500`.

3. ESP32 firmware:
- Copy `firmware/esp32/config.example.h` to `firmware/esp32/config.h`.
- Update Wi-Fi credentials, backend URL, calibration values.
- Open `firmware/esp32/esp32_energy_monitor.ino` in Arduino IDE and upload.

## What This Scaffold Includes

- Phase-based implementation plan and checklist.
- Starter ESP32 firmware structure (sampling, RMS, POST flow).
- Starter backend API (ingest, query, summary, alerts).
- PostgreSQL-backed backend store (Supabase compatible).
- Starter dashboard (real-time cards + trend chart + alerts list).
- SQL schema draft for cloud persistence.
- Render blueprint deployment config.
- Curl-based ingestion simulator for testing without hardware.

## Next Build Steps

1. Complete hardware wiring and calibration constants.
2. Deploy backend to cloud host (Render/Railway/Fly).
3. Validate reading accuracy against clamp meter/multimeter.
4. Run full Phase 5 testing and statistical treatment.
