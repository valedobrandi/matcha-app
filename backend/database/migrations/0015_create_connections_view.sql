CREATE OR REPLACE VIEW connections AS
SELECT mine.from_user_id AS user_id,
       mine.to_user_id AS other_user_id,
       GREATEST(mine.updated_at, theirs.updated_at) AS connected_at
FROM likes mine
JOIN likes theirs
  ON theirs.from_user_id = mine.to_user_id
 AND theirs.to_user_id = mine.from_user_id
WHERE mine.status = 'active'
  AND theirs.status = 'active';
