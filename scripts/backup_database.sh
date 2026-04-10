#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEFAULT_OUTPUT_DIR="${ROOT_DIR}/archive/database_backups"
OUTPUT_DIR="${1:-${DEFAULT_OUTPUT_DIR}}"

if [[ -z "${DATABASE_URL:-}" && -f "${ROOT_DIR}/backend/.env" ]]; then
	set -a
	# shellcheck disable=SC1091
	source "${ROOT_DIR}/backend/.env"
	set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
	printf 'DATABASE_URL is required. Export it first or set it in backend/.env.\n' >&2
	exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
	printf 'pg_dump was not found in PATH. Install PostgreSQL client tools first.\n' >&2
	exit 1
fi

mkdir -p "${OUTPUT_DIR}"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_FILE="${OUTPUT_DIR%/}/supabase-backup-${TIMESTAMP}.sql"

printf 'Creating PostgreSQL backup...\n'
printf 'Output: %s\n' "${BACKUP_FILE}"

pg_dump \
	--format=plain \
	--no-owner \
	--no-privileges \
	"${DATABASE_URL}" >"${BACKUP_FILE}"

printf '\nBackup completed successfully.\n'
printf 'Restore into a fresh database with:\n'
printf '  psql "$DATABASE_URL" < "%s"\n' "${BACKUP_FILE}"
