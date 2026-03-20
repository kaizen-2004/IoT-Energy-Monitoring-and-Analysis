# Insight Test Commands (Today vs Yesterday)

Use these commands to test the dashboard message:
- `You have consumed more kWh today compared to yesterday.`
- `You have consumed less kWh today compared to yesterday.`

Set your API base URL first:

```bash
API_URL="https://iot-energy-monitor-api.onrender.com"
```

## A) Test "More kWh today"

This inserts lower usage yesterday and higher usage today for `Node 1`.

```bash
curl -sS -X POST "$API_URL/api/readings" --json '{"nodeId":"node-01","applianceId":"appliance-01","applianceName":"Node 1","currentRmsA":0.4,"voltageRefV":230,"powerW":90,"thresholdW":250,"abnormal":false,"timestamp":"2026-03-19T10:00:00+08:00"}'
curl -sS -X POST "$API_URL/api/readings" --json '{"nodeId":"node-01","applianceId":"appliance-01","applianceName":"Node 1","currentRmsA":0.4,"voltageRefV":230,"powerW":90,"thresholdW":250,"abnormal":false,"timestamp":"2026-03-19T11:00:00+08:00"}'
curl -sS -X POST "$API_URL/api/readings" --json '{"nodeId":"node-01","applianceId":"appliance-01","applianceName":"Node 1","currentRmsA":1.2,"voltageRefV":230,"powerW":280,"thresholdW":250,"abnormal":true,"timestamp":"2026-03-20T10:00:00+08:00"}'
curl -sS -X POST "$API_URL/api/readings" --json '{"nodeId":"node-01","applianceId":"appliance-01","applianceName":"Node 1","currentRmsA":1.2,"voltageRefV":230,"powerW":280,"thresholdW":250,"abnormal":true,"timestamp":"2026-03-20T11:00:00+08:00"}'
```

Expected insight:
- Today is **more** than yesterday.

## B) Test "Less kWh today"

This inserts higher usage yesterday and lower usage today for `Node 2`.

```bash
curl -sS -X POST "$API_URL/api/readings" --json '{"nodeId":"node-02","applianceId":"appliance-02","applianceName":"Node 2","currentRmsA":2.2,"voltageRefV":230,"powerW":500,"thresholdW":1200,"abnormal":false,"timestamp":"2026-03-19T10:00:00+08:00"}'
curl -sS -X POST "$API_URL/api/readings" --json '{"nodeId":"node-02","applianceId":"appliance-02","applianceName":"Node 2","currentRmsA":2.2,"voltageRefV":230,"powerW":500,"thresholdW":1200,"abnormal":false,"timestamp":"2026-03-19T11:00:00+08:00"}'
curl -sS -X POST "$API_URL/api/readings" --json '{"nodeId":"node-02","applianceId":"appliance-02","applianceName":"Node 2","currentRmsA":0.4,"voltageRefV":230,"powerW":90,"thresholdW":1200,"abnormal":false,"timestamp":"2026-03-20T10:00:00+08:00"}'
curl -sS -X POST "$API_URL/api/readings" --json '{"nodeId":"node-02","applianceId":"appliance-02","applianceName":"Node 2","currentRmsA":0.4,"voltageRefV":230,"powerW":90,"thresholdW":1200,"abnormal":false,"timestamp":"2026-03-20T11:00:00+08:00"}'
```

Expected insight:
- Today is **less** than yesterday.

## C) One-Block Reliable Copy/Paste (Recommended)

Run this exactly as one block:

```bash
API_URL="https://iot-energy-monitor-api.onrender.com"

curl -sS -X POST "$API_URL/api/readings" --json '{"nodeId":"node-01","applianceId":"appliance-01","applianceName":"Node 1","currentRmsA":2.2,"voltageRefV":230,"powerW":500,"thresholdW":250,"abnormal":true,"timestamp":"2026-03-19T10:00:00+08:00"}'
curl -sS -X POST "$API_URL/api/readings" --json '{"nodeId":"node-01","applianceId":"appliance-01","applianceName":"Node 1","currentRmsA":2.2,"voltageRefV":230,"powerW":500,"thresholdW":250,"abnormal":true,"timestamp":"2026-03-19T11:00:00+08:00"}'
curl -sS -X POST "$API_URL/api/readings" --json '{"nodeId":"node-01","applianceId":"appliance-01","applianceName":"Node 1","currentRmsA":0.4,"voltageRefV":230,"powerW":90,"thresholdW":250,"abnormal":false,"timestamp":"2026-03-20T10:00:00+08:00"}'
curl -sS -X POST "$API_URL/api/readings" --json '{"nodeId":"node-01","applianceId":"appliance-01","applianceName":"Node 1","currentRmsA":0.4,"voltageRefV":230,"powerW":90,"thresholdW":250,"abnormal":false,"timestamp":"2026-03-20T11:00:00+08:00"}'
```

Then hard refresh dashboard (`Ctrl+Shift+R`) and click `Apply`.

## Quick Verification Endpoints

```bash
curl "$API_URL/health"
curl "$API_URL/health/db"
curl "$API_URL/api/readings?limit=50"
curl "$API_URL/api/summary?windowMinutes=1440"
curl "$API_URL/api/alerts?limit=20"
```

## Dashboard Verification

1. Open live dashboard URL.
2. Hard refresh (`Ctrl+Shift+R`).
3. Confirm:
   - Total kWh today updates.
   - Node cards show kWh values.
   - Insight text switches to `more` or `less`.
