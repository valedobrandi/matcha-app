-- Owner of the rule "an unspecified orientation is matched as bisexual"
-- sexual_preference keeps the user's own answer (NULL = not specified). Discovery reads
-- matching_preference and never repeats the default.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS matching_preference VARCHAR(20)
    GENERATED ALWAYS AS (COALESCE(sexual_preference, 'bisexual')) STORED;

-- Replaces the definition from migration 0012: the orientation is optional now, so a profile
-- without one can be complete. This view stays the only owner of the "profile completed" rule.

CREATE OR REPLACE VIEW profile_completeness AS
SELECT
    u.id AS user_id,
    (
        u.bio IS NOT NULL
        AND u.age IS NOT NULL
        AND u.gender IS NOT NULL
        AND EXISTS (SELECT 1 FROM user_tags ut WHERE ut.user_id = u.id)
        AND EXISTS (SELECT 1 FROM user_photos up WHERE up.user_id = u.id)
    ) AS is_completed
FROM users u;
