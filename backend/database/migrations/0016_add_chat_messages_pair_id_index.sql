CREATE INDEX IF NOT EXISTS idx_chat_messages_pair_id
  ON chat_messages (
    LEAST(from_user_id, to_user_id),
    GREATEST(from_user_id, to_user_id),
    id
  );
