#!/usr/bin/env bash
set -euo pipefail

API_BASE="${1:-http://localhost:8080}"
ENDPOINT="${API_BASE%/}/api/readings"

now_iso() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

post_sample() {
  local appliance_id="$1"
  local appliance_name="$2"
  local current="$3"
  local voltage="$4"
  local power="$5"
  local threshold="$6"
  local abnormal="$7"

  curl -sS -X POST "${ENDPOINT}" \
    -H "Content-Type: application/json" \
    -d "{
      \"nodeId\": \"node-01\",
      \"applianceId\": \"${appliance_id}\",
      \"applianceName\": \"${appliance_name}\",
      \"currentRmsA\": ${current},
      \"voltageRefV\": ${voltage},
      \"powerW\": ${power},
      \"energyWh\": 0.10,
      \"frequencyHz\": 60,
      \"thresholdW\": ${threshold},
      \"abnormal\": ${abnormal},
      \"timestamp\": \"$(now_iso)\"
    }"
  echo
}

echo "Posting sample readings to ${ENDPOINT}"

post_sample "appliance-01" "electric-fan" 0.35 230.0 80.5 250.0 false
post_sample "appliance-02" "rice-cooker" 2.90 230.0 667.0 1200.0 false
post_sample "appliance-03" "television" 1.20 230.0 276.0 250.0 true

echo "Done. Check:"
echo "  ${API_BASE%/}/api/readings?limit=20"
echo "  ${API_BASE%/}/api/alerts?limit=20"
echo "  ${API_BASE%/}/api/summary?windowMinutes=60"

