seed_dir="$HOME/.config/employee-leave-demo"
seed_sql_path="$seed_dir/demo-seed.sql"

if [[ -e "$seed_sql_path" ]]; then
  printf 'File already exists; leaving it unchanged: %s\n' "$seed_sql_path"
else
  umask 077
  mkdir -p "$seed_dir"
  cat > "$seed_sql_path" <<'SQL'
BEGIN;

INSERT INTO app_user (display_name, email, password_hash, role)
VALUES
  ('Demo Employee', 'employee@test.com',
   crypt('password123', gen_salt('bf', 10)), 'EMPLOYEE'),
  ('Demo Manager', 'manger@test.com',
   crypt('password123', gen_salt('bf', 10)), 'MANAGER')
ON CONFLICT (email) DO NOTHING;

DO $seed$
DECLARE
  employee_uuid uuid;
  manager_uuid uuid;
  assigned_manager_uuid uuid;
BEGIN
  SELECT id INTO employee_uuid
  FROM app_user
  WHERE email = 'employee@test.com' AND role = 'EMPLOYEE';

  SELECT id INTO manager_uuid
  FROM app_user
  WHERE email = 'manger@test.com' AND role = 'MANAGER';

  IF employee_uuid IS NULL OR manager_uuid IS NULL THEN
    RAISE EXCEPTION 'Expected demo accounts are missing or have incorrect roles';
  END IF;

  INSERT INTO employee_manager_assignment (employee_id, manager_id)
  VALUES (employee_uuid, manager_uuid)
  ON CONFLICT (employee_id) DO NOTHING;

  SELECT manager_id INTO assigned_manager_uuid
  FROM employee_manager_assignment
  WHERE employee_id = employee_uuid;

  IF assigned_manager_uuid IS DISTINCT FROM manager_uuid THEN
    RAISE EXCEPTION 'Employee is already assigned to a different Manager';
  END IF;
END
$seed$;

COMMIT;
SQL
  chmod 600 "$seed_sql_path"
  printf 'Created owner-only seed file: %s\n' "$seed_sql_path"
fi