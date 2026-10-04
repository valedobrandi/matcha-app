-- Single owner of the "profile completed" rule. /users/me, the session contract and
-- discovery all read this view; do not repeat the conditions anywhere else.
CREATE OR REPLACE VIEW profile_completeness AS
SELECT
    u.id AS user_id,
    (
        u.bio IS NOT NULL
        AND u.age IS NOT NULL
        AND u.gender IS NOT NULL
        AND u.sexual_preference IS NOT NULL
        AND EXISTS (SELECT 1 FROM user_tags ut WHERE ut.user_id = u.id)
        AND EXISTS (SELECT 1 FROM user_photos up WHERE up.user_id = u.id)
    ) AS is_completed
FROM users u;
