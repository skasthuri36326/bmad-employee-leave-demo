\set ON_ERROR_STOP on
BEGIN;

DELETE FROM leave_request
WHERE position(:'marker' in reason) > 0
   OR employee_id IN (
     SELECT id FROM app_user
     WHERE email IN (:'marker' || '.employee@invalid.test', :'marker' || '.manager@invalid.test')
   );

DELETE FROM employee_manager_assignment
WHERE employee_id IN (
     SELECT id FROM app_user WHERE email = :'marker' || '.employee@invalid.test'
   )
   OR manager_id IN (
     SELECT id FROM app_user WHERE email = :'marker' || '.manager@invalid.test'
   );

DELETE FROM app_user
WHERE email IN (:'marker' || '.employee@invalid.test', :'marker' || '.manager@invalid.test');

COMMIT;
