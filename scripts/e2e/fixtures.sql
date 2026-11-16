\set ON_ERROR_STOP on
BEGIN;

INSERT INTO app_user (display_name, email, password_hash, role)
VALUES
  ('E2E Employee ' || :'marker', :'marker' || '.employee@invalid.test', crypt('e2e-fixture-' || :'marker', gen_salt('bf', 10)), 'EMPLOYEE'),
  ('E2E Manager ' || :'marker', :'marker' || '.manager@invalid.test', crypt('e2e-fixture-' || :'marker', gen_salt('bf', 10)), 'MANAGER');

INSERT INTO employee_manager_assignment (employee_id, manager_id)
SELECT employee.id, manager.id
FROM app_user employee
CROSS JOIN app_user manager
WHERE employee.email = :'marker' || '.employee@invalid.test'
  AND manager.email = :'marker' || '.manager@invalid.test';

INSERT INTO leave_request (employee_id, start_date, end_date, reason)
SELECT employee.id, CURRENT_DATE + 30, CURRENT_DATE + 30, 'E2E fixture ' || :'marker'
FROM app_user employee
WHERE employee.email = :'marker' || '.employee@invalid.test';

COMMIT;
