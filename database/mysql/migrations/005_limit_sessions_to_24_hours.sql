UPDATE sessions
SET expires_at = LEAST(expires_at, DATE_ADD(created_at, INTERVAL 1 DAY))
WHERE revoked_at IS NULL
  AND expires_at > DATE_ADD(created_at, INTERVAL 1 DAY);
