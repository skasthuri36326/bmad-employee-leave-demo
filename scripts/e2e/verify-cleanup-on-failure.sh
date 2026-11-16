#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
credentials="${E2E_CREDENTIALS_FILE:-$HOME/.config/employee-leave-demo/e2e-credentials.env}"
if [[ ! -r "$credentials" ]]; then
  echo "Set E2E_CREDENTIALS_FILE to the readable ignored seeded-account credentials file." >&2
  exit 2
fi

read_credential() {
  local key="$1" value
  value="$(sed -n "s/^${key}=//p" "$credentials" | head -n 1)"
  value="${value%$'\r'}"
  if [[ "${value:0:1}" == '"' && "${value: -1}" == '"' ]] || [[ "${value:0:1}" == "'" && "${value: -1}" == "'" ]]; then
    value="${value:1:${#value}-2}"
  fi
  [[ -n "$value" ]] || { echo "Missing $key in the E2E credentials file." >&2; exit 2; }
  printf '%s' "$value"
}

employee_email="$(read_credential DEMO_EMPLOYEE_EMAIL)"
manager_email="$(read_credential DEMO_MANAGER_EMAIL)"
real_docker="$(command -v docker)"
real_node="$(command -v node)"
test_dir="$(mktemp -d "${TMPDIR:-/tmp}/employee-leave-e2e-cleanup-check.XXXXXX")"
chmod 700 "$test_dir"
trap 'rm -rf "$test_dir"' EXIT
mkdir "$test_dir/bin"

cat > "$test_dir/bin/docker" <<'WRAPPER'
#!/usr/bin/env bash
set -Eeuo pipefail
if [[ "$E2E_FAILURE_MODE" == runner && "$*" == *"run --build --rm --no-deps e2e npm run test:e2e"* ]]; then
  printf '%s\n%s\n' "$E2E_RUNTIME_DIR" "$(cat "$E2E_RUNTIME_DIR/run-marker")" > "$E2E_TEST_CAPTURE"
  exit 97
fi
if [[ "$E2E_FAILURE_MODE" == manifest && "$*" == *"exec -T -e E2E_RUN_MARKER="* && "$*" != *"E2E_EMPLOYEE_ID="* ]]; then
  printf '%s\n%s\n' "$E2E_RUNTIME_DIR" "$(cat "$E2E_RUNTIME_DIR/run-marker")" > "$E2E_TEST_CAPTURE"
  exit 98
fi
if [[ "$E2E_FAILURE_MODE" == invalid-manifest && "$*" == *"exec -T -e E2E_RUN_MARKER="* && "$*" != *"E2E_EMPLOYEE_ID="* ]]; then
  printf '%s\n%s\n' "$E2E_RUNTIME_DIR" "$(cat "$E2E_RUNTIME_DIR/run-marker")" > "$E2E_TEST_CAPTURE"
  cat >/dev/null
  printf '{invalid manifest'
  exit 0
fi
if [[ "$E2E_FAILURE_MODE" == setup && "$*" == *"exec -T -e E2E_RUN_MARKER="* && "$*" == *"E2E_EMPLOYEE_ID="* ]]; then
  sql="$(cat)"
  if [[ "$sql" == *"INSERT INTO app_user"* ]]; then
    printf '%s\n%s\n' "$E2E_RUNTIME_DIR" "$(cat "$E2E_RUNTIME_DIR/run-marker")" > "$E2E_TEST_CAPTURE"
    printf '%s\n' "$sql" | sed '/^COMMIT;$/d' > "$E2E_TEST_SQL"
    printf '\nSELECT 1 / 0;\n' >> "$E2E_TEST_SQL"
    if "$E2E_TEST_REAL_DOCKER" "$@" < "$E2E_TEST_SQL"; then exit 0; else exit $?; fi
  fi
  printf '%s\n' "$sql" | "$E2E_TEST_REAL_DOCKER" "$@"
  exit $?
fi
exec "$E2E_TEST_REAL_DOCKER" "$@"
WRAPPER
chmod 700 "$test_dir/bin/docker"

cat > "$test_dir/bin/node" <<'NODE_WRAPPER'
#!/usr/bin/env bash
set -Eeuo pipefail
if [[ "${E2E_FAILURE_MODE:-}" == marker && "$*" == *"randomUUID()"* ]]; then
  find "$TMPDIR" -mindepth 1 -maxdepth 1 -type d -name 'employee-leave-e2e.*' -print -quit > "$E2E_TEST_CAPTURE"
  exit 99
fi
exec "$E2E_TEST_REAL_NODE" "$@"
NODE_WRAPPER
chmod 700 "$test_dir/bin/node"

verify_marker_failure() {
  local capture="$test_dir/marker.capture" log="$test_dir/marker.log" helper_status=0 runtime
  if env PATH="$test_dir/bin:$PATH" TMPDIR="$test_dir" \
    E2E_CREDENTIALS_FILE="$credentials" E2E_FAILURE_MODE=marker \
    E2E_TEST_REAL_DOCKER="$real_docker" E2E_TEST_REAL_NODE="$real_node" \
    E2E_TEST_CAPTURE="$capture" \
    "$ROOT/scripts/run-local-e2e.sh" >"$log" 2>&1; then
    echo "Expected marker generation to fail, but the helper succeeded." >&2
    exit 1
  else
    helper_status=$?
  fi
  if [[ "$helper_status" -ne 99 || ! -r "$capture" ]]; then
    cat "$log" >&2
    echo "Unexpected marker failure result: status $helper_status." >&2
    exit 1
  fi
  runtime="$(cat "$capture")"
  [[ -n "$runtime" && ! -e "$runtime" ]] || { echo "The pre-fixture run directory was not removed after marker failure." >&2; exit 1; }
}

verify_case() {
  local mode="$1" expected_status="$2" capture log
  capture="$test_dir/${mode}.capture"
  log="$test_dir/${mode}.log"
  local helper_status=0 runtime marker counts
  if env PATH="$test_dir/bin:$PATH" TMPDIR="$test_dir" \
    E2E_CREDENTIALS_FILE="$credentials" E2E_FAILURE_MODE="$mode" \
    E2E_TEST_REAL_DOCKER="$real_docker" E2E_TEST_REAL_NODE="$real_node" \
    E2E_TEST_CAPTURE="$capture" E2E_TEST_SQL="$test_dir/injected-setup.sql" \
    "$ROOT/scripts/run-local-e2e.sh" >"$log" 2>&1; then
    echo "Expected the injected $mode failure, but the helper succeeded." >&2
    exit 1
  else
    helper_status=$?
  fi
  if [[ "$helper_status" -ne "$expected_status" || ! -r "$capture" ]]; then
    cat "$log" >&2
    echo "Unexpected $mode failure result: status $helper_status." >&2
    exit 1
  fi
  runtime="$(sed -n '1p' "$capture")"
  marker="$(sed -n '2p' "$capture")"
  [[ -n "$runtime" && -n "$marker" ]] || { echo "The $mode run marker was not captured." >&2; exit 1; }
  [[ ! -e "$runtime" ]] || { echo "The $mode run directory was not removed after cleanup." >&2; exit 1; }

  counts="$("$real_docker" compose -f "$ROOT/compose.yaml" exec -T \
    -e E2E_CHECK_MARKER="$marker" -e E2E_CHECK_EMPLOYEE_EMAIL="$employee_email" \
    -e E2E_CHECK_MANAGER_EMAIL="$manager_email" postgres \
    sh -c 'export PGPASSWORD="$POSTGRES_PASSWORD"; exec psql -X -qAt -F "|" -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v marker="$E2E_CHECK_MARKER" -v employee_email="$E2E_CHECK_EMPLOYEE_EMAIL" -v manager_email="$E2E_CHECK_MANAGER_EMAIL"' \
    < "$ROOT/scripts/e2e/assert-cleaned.sql")"
  [[ "$counts" == "0|0|0|2|1" ]] || {
    echo "Unexpected database counts after $mode failure: $counts" >&2
    exit 1
  }
}

verify_case runner 97
verify_case manifest 98
verify_case invalid-manifest 1
verify_case setup 3
verify_marker_failure
echo "Cleanup passed for marker generation failure, transactional setup failure, runner failure, post-commit manifest failure, and invalid manifest; seeded accounts and assignment remain."
