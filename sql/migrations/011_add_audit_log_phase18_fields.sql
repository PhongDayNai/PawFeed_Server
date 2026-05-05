ALTER TABLE audit_logs
  ADD COLUMN actor_role VARCHAR(50) NULL AFTER actor_user_id,
  ADD COLUMN metadata JSON NULL AFTER target_id;

UPDATE audit_logs
SET metadata = payload
WHERE metadata IS NULL AND payload IS NOT NULL;

CREATE INDEX idx_audit_logs_actor_role ON audit_logs (actor_role);
CREATE INDEX idx_audit_logs_actor_action ON audit_logs (actor_user_id, action);
CREATE INDEX idx_audit_logs_action_created_at ON audit_logs (action, created_at);
