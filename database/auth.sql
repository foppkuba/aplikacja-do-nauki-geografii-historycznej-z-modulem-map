BEGIN;

DO $$
BEGIN
    IF to_regclass('public.sessions') IS NOT NULL
       AND to_regclass('public.user_sessions') IS NULL THEN
        ALTER TABLE sessions RENAME TO user_sessions;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'user_sessions'
                 AND column_name = 'refresh_token_hash')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema = 'public' AND table_name = 'user_sessions'
                         AND column_name = 'token_hash') THEN
        ALTER TABLE user_sessions RENAME COLUMN refresh_token_hash TO token_hash;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS users (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email varchar(254) NOT NULL,
    password_hash text NOT NULL,
    display_name varchar(100) NOT NULL
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS role varchar(20) NOT NULL DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
UPDATE users SET email = lower(trim(email));
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx ON users (lower(email));

CREATE TABLE IF NOT EXISTS user_sessions (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash char(64) NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL
);

ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS user_agent varchar(500);
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS ip_address inet;
CREATE INDEX IF NOT EXISTS user_sessions_user_idx ON user_sessions (user_id);
CREATE INDEX IF NOT EXISTS user_sessions_expiry_idx ON user_sessions (expires_at);

COMMIT;
