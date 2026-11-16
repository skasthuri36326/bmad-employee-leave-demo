SELECT json_build_object(
  'marker', :'marker',
  'employeeId', (SELECT id::text FROM app_user WHERE email = :'marker' || '.employee@invalid.test'),
  'managerId', (SELECT id::text FROM app_user WHERE email = :'marker' || '.manager@invalid.test'),
  'requestId', (SELECT id::text FROM leave_request WHERE reason = 'E2E fixture ' || :'marker')
)::text;
