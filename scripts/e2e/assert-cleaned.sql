SELECT
  (SELECT count(*) FROM leave_request
   WHERE position(:'marker' in reason) > 0) AS marked_requests,
  (SELECT count(*) FROM app_user WHERE email IN (:'marker' || '.employee@invalid.test', :'marker' || '.manager@invalid.test')) AS fixture_accounts,
  (SELECT count(*)
   FROM employee_manager_assignment assignment
   JOIN app_user employee ON employee.id = assignment.employee_id
   JOIN app_user manager ON manager.id = assignment.manager_id
   WHERE employee.email = :'marker' || '.employee@invalid.test'
     AND manager.email = :'marker' || '.manager@invalid.test') AS fixture_assignments,
  (SELECT count(*) FROM app_user WHERE email IN (:'employee_email', :'manager_email')) AS seeded_accounts,
  (SELECT count(*)
   FROM employee_manager_assignment assignment
   JOIN app_user employee ON employee.id = assignment.employee_id
   JOIN app_user manager ON manager.id = assignment.manager_id
   WHERE employee.email = :'employee_email' AND manager.email = :'manager_email') AS seeded_assignments;
