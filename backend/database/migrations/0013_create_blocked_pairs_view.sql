-- Single owner of the "active block between two users, in either direction" rule (ADR-0008).
-- One row per direction of each active block: (user_id, other_user_id) never see each other.
-- Every query that hides blocked users reads this view; do not repeat the condition anywhere else.
CREATE OR REPLACE VIEW blocked_pairs AS
SELECT from_user_id AS user_id, to_user_id AS other_user_id
FROM blocks
WHERE status = 'active'
UNION ALL
SELECT to_user_id AS user_id, from_user_id AS other_user_id
FROM blocks
WHERE status = 'active';
