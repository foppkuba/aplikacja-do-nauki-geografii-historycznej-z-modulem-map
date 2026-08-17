BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email citext NOT NULL UNIQUE,
    password_hash text,
    display_name varchar(100) NOT NULL,
    role varchar(20) NOT NULL DEFAULT 'user'
        CHECK (role IN ('user', 'editor', 'admin')),
    auth_provider varchar(30) NOT NULL DEFAULT 'local',
    auth_provider_subject text,
    email_verified_at timestamptz,
    disabled_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (
        (auth_provider = 'local' AND password_hash IS NOT NULL)
        OR (auth_provider <> 'local' AND auth_provider_subject IS NOT NULL)
    ),
    UNIQUE (auth_provider, auth_provider_subject)
);

CREATE TABLE sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash char(64) NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    last_used_at timestamptz,
    ip_address inet,
    user_agent text
);

CREATE INDEX sessions_active_user_idx
    ON sessions (user_id, expires_at)
    WHERE revoked_at IS NULL;

CREATE TABLE event_categories (
    id smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    slug varchar(60) NOT NULL UNIQUE,
    name varchar(100) NOT NULL UNIQUE,
    color char(7)
        CHECK (color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$')
);

CREATE TABLE historical_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_id integer UNIQUE,
    slug varchar(180) NOT NULL UNIQUE,
    title varchar(200) NOT NULL,
    summary text,
    description text NOT NULL,
    event_type varchar(30) NOT NULL
        CHECK (event_type IN ('battle', 'political', 'economic', 'social', 'other')),
    category_id smallint REFERENCES event_categories(id) ON DELETE SET NULL,
    start_date date NOT NULL,
    end_date date,
    date_precision varchar(10) NOT NULL DEFAULT 'day'
        CHECK (date_precision IN ('day', 'month', 'year')),
    display_date varchar(120) NOT NULL,
    place_name varchar(180),
    country_name varchar(120),
    location geography(Point, 4326),
    status varchar(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published', 'archived')),
    created_by uuid REFERENCES users(id) ON DELETE SET NULL,
    updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
    version integer NOT NULL DEFAULT 1 CHECK (version > 0),
    published_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (end_date IS NULL OR end_date >= start_date),
    CHECK ((status = 'published' AND published_at IS NOT NULL) OR status <> 'published')
);

CREATE INDEX historical_events_dates_idx
    ON historical_events (start_date, end_date);
CREATE INDEX historical_events_category_idx
    ON historical_events (category_id, start_date)
    WHERE status = 'published';
CREATE INDEX historical_events_location_idx
    ON historical_events USING gist (location);

CREATE TABLE event_sources (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_id uuid NOT NULL REFERENCES historical_events(id) ON DELETE CASCADE,
    title text NOT NULL,
    author text,
    url text,
    publication_year smallint,
    accessed_at date,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE campaign_routes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid REFERENCES historical_events(id) ON DELETE SET NULL,
    slug varchar(180) NOT NULL UNIQUE,
    title varchar(200) NOT NULL,
    description text,
    side varchar(30),
    start_date date NOT NULL,
    end_date date NOT NULL,
    path geography(LineString, 4326) NOT NULL,
    properties jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (end_date >= start_date)
);

CREATE INDEX campaign_routes_dates_idx ON campaign_routes (start_date, end_date);
CREATE INDEX campaign_routes_path_idx ON campaign_routes USING gist (path);

CREATE TABLE user_event_progress (
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id uuid NOT NULL REFERENCES historical_events(id) ON DELETE CASCADE,
    state varchar(20) NOT NULL DEFAULT 'viewed'
        CHECK (state IN ('viewed', 'in_progress', 'completed')),
    is_favorite boolean NOT NULL DEFAULT false,
    first_viewed_at timestamptz NOT NULL DEFAULT now(),
    last_viewed_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    PRIMARY KEY (user_id, event_id),
    CHECK ((state = 'completed' AND completed_at IS NOT NULL) OR state <> 'completed')
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER historical_events_set_updated_at
BEFORE UPDATE ON historical_events
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER campaign_routes_set_updated_at
BEFORE UPDATE ON campaign_routes
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO event_categories (slug, name, color) VALUES
    ('wojna', 'Wojna', '#A33A32'),
    ('polityka', 'Polityka', '#315C78'),
    ('gospodarka', 'Gospodarka', '#8A6A2F');

COMMIT;
