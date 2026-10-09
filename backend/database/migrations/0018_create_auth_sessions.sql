CREATE TABLE IF NOT EXISTS auth_sessions (
    id UUID PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions (user_id);

CREATE TABLE IF NOT EXISTS auth_session_revocations (
    session_id UUID PRIMARY KEY REFERENCES auth_sessions(id) ON DELETE CASCADE,
    revoked_at TIMESTAMP NOT NULL DEFAULT NOW()
);
