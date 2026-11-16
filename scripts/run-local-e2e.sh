#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
credentials="${E2E_CREDENTIALS_FILE:-$HOME/.config/employee-leave-demo/e2e-credentials.env}"
if [[ ! -r "$credentials" ]]; then
  echo "Set E2E_CREDENTIALS_FILE to the readable ignored seeded-account credentials file." >&2
  exit 2
fi
credentials="$(cd "$(dirname "$credentials")" && pwd -P)/$(basename "$credentials")"
export E2E_CREDENTIALS_FILE="$credentials"
for service in postgres backend frontend; do
  container_id="$(docker compose -f compose.yaml ps -q "$service")"
  [[ -n "$container_id" ]] || { echo "$service is not running; start the application stack separately." >&2; exit 2; }
  state="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}no-healthcheck{{end}}' "$container_id")"
  [[ "$state" == healthy ]] || { echo "$service must be healthy before running E2E (state: $state)." >&2; exit 2; }
done

runtime="$(mktemp -d "${TMPDIR:-/tmp}/employee-leave-e2e.XXXXXX")"
chmod 700 "$runtime"
marker="e2e-$(node -e 'process.stdout.write(require("node:crypto").randomUUID())')"
printf '%s\n' "$marker" > "$runtime/run-marker"
chmod 400 "$runtime/run-marker"
export E2E_RUNTIME_DIR="$runtime"
employee_id=""
manager_id=""
request_id=""

psql_file() {
  local file="$1"
  docker compose -f compose.yaml exec -T \
    -e E2E_RUN_MARKER="$marker" -e E2E_EMPLOYEE_ID="$employee_id" \
    -e E2E_MANAGER_ID="$manager_id" -e E2E_REQUEST_ID="$request_id" postgres \
    sh -c 'export PGPASSWORD="$POSTGRES_PASSWORD"; exec psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v marker="$E2E_RUN_MARKER" -v employee_id="$E2E_EMPLOYEE_ID" -v manager_id="$E2E_MANAGER_ID" -v request_id="$E2E_REQUEST_ID"' < "$file"
}
psql_manifest() {
  local file="$1"
  docker compose -f compose.yaml exec -T -e E2E_RUN_MARKER="$marker" postgres \
    sh -c 'export PGPASSWORD="$POSTGRES_PASSWORD"; exec psql -X -qAt -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v marker="$E2E_RUN_MARKER"' < "$file"
}
cleanup() {
  local result=$?
  trap - EXIT INT TERM
  if [[ -r "$runtime/manifest.json" ]]; then
    IFS=$'\t' read -r employee_id manager_id request_id <<< "$(node -e 'const m=require(process.argv[1]);process.stdout.write([m.employeeId,m.managerId,m.requestId].join("\t"))' "$runtime/manifest.json")"
  fi
  if ! psql_file "$ROOT/scripts/e2e/cleanup.sql"; then
    echo "Fixture cleanup failed; the run marker and manifest remain in $runtime." >&2
    result=1
  else
    rm -rf "$runtime"
  fi
  exit "$result"
}
trap cleanup EXIT INT TERM

psql_file "$ROOT/scripts/e2e/fixtures.sql"
manifest="$(psql_manifest "$ROOT/scripts/e2e/manifest.sql")"
node -e 'const m=JSON.parse(process.argv[1]);for(const key of ["marker","employeeId","managerId","requestId"])if(typeof m[key]!=="string"||!m[key])throw Error("Fixture manifest is incomplete.");process.stdout.write(JSON.stringify(m)+"\n")' "$manifest" > "$runtime/manifest.json"
chmod 400 "$runtime/manifest.json"
IFS=$'\t' read -r employee_id manager_id request_id <<< "$(node -e 'const m=JSON.parse(process.argv[1]);process.stdout.write([m.employeeId,m.managerId,m.requestId].join("\t"))' "$manifest")"
docker compose -f compose.yaml -f compose.e2e.yaml run --build --rm --no-deps e2e npm run test:e2e
