\set ON_ERROR_STOP on
BEGIN;

DELETE FROM leave_request
WHERE id = NULLIF(:'request_id', '')::uuid
   OR reason LIKE '%' || :'marker' || '%'
   OR employee_id IN (
     SELECT id FROM app_user
     WHERE email IN (:'marker' || '.employee@invalid.test', :'marker' || '.manager@invalid.test')
   );

DELETE FROM employee_manager_assignment
WHERE employee_id = NULLIF(:'employee_id', '')::uuid
   OR manager_id = NULLIF(:'manager_id', '')::uuid
   OR employee_id IN (
     SELECT id FROM app_user WHERE email = :'marker' || '.employee@invalid.test'
   )
   OR manager_id IN (
     SELECT id FROM app_user WHERE email = :'marker' || '.manager@invalid.test'
   );

DELETE FROM app_user
WHERE id IN (NULLIF(:'employee_id', '')::uuid, NULLIF(:'manager_id', '')::uuid)
   OR email IN (:'marker' || '.employee@invalid.test', :'marker' || '.manager@invalid.test');

COMMIT;
