#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: ./use_node_config.sh node-01|node-02|node-03"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE="$1"
SOURCE_FILE="${SCRIPT_DIR}/config.${NODE}.example.h"
TARGET_FILE="${SCRIPT_DIR}/config.h"

if [[ ! -f "${SOURCE_FILE}" ]]; then
  echo "Unknown node '${NODE}'. Expected: node-01, node-02, node-03"
  exit 1
fi

cp "${SOURCE_FILE}" "${TARGET_FILE}"
echo "Created ${TARGET_FILE} from ${SOURCE_FILE}"
echo "Edit Wi-Fi credentials in config.h before flashing."
