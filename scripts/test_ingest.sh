#!/usr/bin/env bash
set -euo pipefail

API_BASE="${1:-http://localhost:8080}"
ENDPOINT="${API_BASE%/}/api/readings"

now_iso() {
	date -u +"%Y-%m-%dT%H:%M:%SZ"
}

post_sample() {
	local node_id="$1"
	local appliance_id="$2"
	local appliance_name="$3"
	local current="$4"
	local voltage="$5"
	local power="$6"
	local threshold="$7"
	local abnormal="$8"

	curl -sS -X POST "${ENDPOINT}" \
		-H "Content-Type: application/json" \
		-d "{
      \"nodeId\": \"${node_id}\",
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

post_sample "node-01" "appliance-01" "electric-fan" 2.30 230.0 529.0 250.0 false
post_sample "node-02" "appliance-02" "rice-cooker" 4.00 230.0 920.0 1200.0 false
post_sample "node-03" "appliance-03" "television" 2.90 230.0 667.0 250.0 false

echo "Done. Check:"
echo "  ${API_BASE%/}/api/readings?limit=20"
echo "  ${API_BASE%/}/api/alerts?limit=20"
echo "  ${API_BASE%/}/api/summary?windowMinutes=60"
