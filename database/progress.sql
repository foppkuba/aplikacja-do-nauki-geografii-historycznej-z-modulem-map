BEGIN;

-- Match users.id in both the original UUID schema and the newer bigint schema.
DO $$
DECLARE user_id_type text;
BEGIN
    SELECT format_type(atttypid, atttypmod) INTO user_id_type
    FROM pg_attribute WHERE attrelid = 'users'::regclass AND attname = 'id';
    EXECUTE format('CREATE TABLE IF NOT EXISTS learning_attempts (
        id uuid PRIMARY KEY,
        user_id %s NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        kind varchar(10) NOT NULL CHECK (kind IN (''lesson'', ''quiz'')),
        slug varchar(100) NOT NULL,
        title text NOT NULL,
        score integer NOT NULL CHECK (score >= 0),
        total integer NOT NULL CHECK (total > 0 AND score <= total),
        duration_seconds integer NOT NULL CHECK (duration_seconds BETWEEN 0 AND 86400),
        completed_at timestamptz NOT NULL DEFAULT now()
    )', user_id_type);
END $$;

CREATE INDEX IF NOT EXISTS learning_attempts_user_date_idx
    ON learning_attempts (user_id, completed_at DESC);
COMMIT;
