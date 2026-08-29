BEGIN;

CREATE TABLE users (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email varchar(255) NOT NULL UNIQUE,
    password_hash text NOT NULL,
    display_name varchar(100) NOT NULL
);

CREATE TABLE sessions (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash text NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL
);

CREATE TABLE event_categories (
    id smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name varchar(100) NOT NULL UNIQUE,
    color char(7)
        CHECK (color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$')
);

CREATE TABLE country_periods (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name varchar(120) NOT NULL,
    valid_from smallint NOT NULL,
    valid_to smallint NOT NULL,
    longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    zoom real NOT NULL DEFAULT 5 CHECK (zoom BETWEEN 2 AND 10),
    CHECK (valid_from <= valid_to),
    UNIQUE (name, valid_from, valid_to)
);

CREATE INDEX country_periods_years_idx ON country_periods (valid_from, valid_to);

CREATE TABLE historical_events (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title varchar(200) NOT NULL,
    description text NOT NULL,
    category_id smallint REFERENCES event_categories(id) ON DELETE SET NULL,
    event_date date NOT NULL,
    place varchar(180) NOT NULL,
    country varchar(120) NOT NULL,
    longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    external_id varchar(40)
);

CREATE UNIQUE INDEX historical_events_external_id_idx
    ON historical_events (external_id) WHERE external_id IS NOT NULL;

CREATE TABLE event_sources (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_id bigint NOT NULL REFERENCES historical_events(id) ON DELETE CASCADE,
    title text NOT NULL,
    url text
);

CREATE TABLE campaign_routes (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_id bigint REFERENCES historical_events(id) ON DELETE SET NULL,
    title varchar(200) NOT NULL,
    path jsonb NOT NULL
);

CREATE TABLE user_event_progress (
    user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id bigint NOT NULL REFERENCES historical_events(id) ON DELETE CASCADE,
    is_favorite boolean NOT NULL DEFAULT false,
    is_completed boolean NOT NULL DEFAULT false,
    PRIMARY KEY (user_id, event_id)
);

CREATE INDEX historical_events_date_idx
    ON historical_events (event_date);

CREATE INDEX historical_events_category_idx
    ON historical_events (category_id, event_date);

INSERT INTO event_categories (name, color) VALUES
    ('Wojna', '#A33A32'),
    ('Polityka', '#315C78'),
    ('Gospodarka', '#8A6A2F');

COMMIT;
