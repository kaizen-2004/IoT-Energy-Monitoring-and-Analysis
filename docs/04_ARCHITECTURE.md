# Architecture and Data Flow

## System Overview

The implementation follows this flow:

1. `SCT-013-000` measures appliance line current (non-invasive clamp).
2. Burden resistor converts CT current output to measurable voltage.
3. `ESP32` samples analog signal and computes:
   - RMS current
   - Estimated power (`P = V x I`)
4. ESP32 sends formatted payload via Wi-Fi to backend API.
5. Backend stores data and serves dashboard queries.
6. Web dashboard displays real-time, historical, and alert data.

## Logical Components

- **Sensor Layer**
  - SCT-013-000 per appliance/channel
  - Burden resistor + conditioning

- **Edge Compute Layer**
  - ESP32 firmware
  - Sampling, RMS, calibration
  - Transmission and retry logic

- **Cloud/Server Layer**
  - Ingestion API
  - Storage (time-series capable schema)
  - Aggregation endpoints

- **Presentation Layer**
  - Browser-based dashboard
  - Real-time cards
  - Historical trend charts
  - Alerts panel

## Starter Payload Contract (Device -> API)

```json
{
  "nodeId": "node-01",
  "applianceId": "appliance-01",
  "applianceName": "electric-fan",
  "currentRmsA": 0.53,
  "voltageRefV": 230.0,
  "powerW": 121.9,
  "energyWh": 3.38,
  "frequencyHz": 60,
  "thresholdW": 300.0,
  "abnormal": false,
  "timestamp": "2026-03-12T22:00:00.000Z"
}
```

## Suggested API Endpoints (Starter)

- `POST /api/readings`
  - Ingest one reading entry.
- `GET /api/readings?limit=120&applianceId=appliance-01`
  - Retrieve readings, newest first.
- `GET /api/summary?windowMinutes=60`
  - Return average/min/max and sample count per appliance.
- `GET /api/alerts?limit=50`
  - Return abnormal or threshold-exceeding readings.

## Quality Targets (Initial)

- Sampling/transmission cycle: 2-5 seconds.
- End-to-end dashboard freshness: under 10 seconds.
- Data ingestion success rate: at least 95% in home Wi-Fi conditions.
- Sensor error target: define by calibration policy (report percentage error).

