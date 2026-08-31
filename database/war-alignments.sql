BEGIN;

CREATE TABLE IF NOT EXISTS war_country_alignments (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    war varchar(20) NOT NULL,
    side varchar(20) NOT NULL CHECK (side IN ('central', 'entente')),
    country varchar(120) NOT NULL,
    map_names jsonb NOT NULL,
    valid_from char(7) NOT NULL,
    valid_to char(7) NOT NULL,
    CHECK (valid_from ~ '^[0-9]{4}-[0-9]{2}$'),
    CHECK (valid_to ~ '^[0-9]{4}-[0-9]{2}$'),
    CHECK (valid_from <= valid_to),
    UNIQUE (war, country, valid_from)
);

CREATE INDEX IF NOT EXISTS war_country_alignments_period_idx
    ON war_country_alignments (war, valid_from, valid_to);

CREATE TABLE IF NOT EXISTS war_territorial_keyframes (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    war varchar(20) NOT NULL,
    month char(7) NOT NULL,
    front_longitudes jsonb NOT NULL,
    occupied_countries jsonb NOT NULL DEFAULT '[]'::jsonb,
    note text,
    UNIQUE (war, month)
);

INSERT INTO war_country_alignments (war, side, country, map_names, valid_from, valid_to) VALUES
('ww1', 'central', 'Cesarstwo Niemieckie', '["Germany", "German Empire", "Niemcy", "Cesarstwo Niemieckie", "Deutsches Reich"]', '1914-07', '1918-11'),
('ww1', 'central', 'Austro-Węgry', '["Austria-Hungary", "Austro-Hungarian Empire", "Austro-Węgry", "Austria", "Hungary", "Węgry"]', '1914-07', '1918-11'),
('ww1', 'central', 'Imperium Osmańskie', '["Ottoman Empire", "Turkey", "Turcja", "Imperium Osmańskie"]', '1914-10', '1918-10'),
('ww1', 'central', 'Bułgaria', '["Bulgaria", "Tsardom of Bulgaria", "Bułgaria", "Carstwo Bułgarii"]', '1915-10', '1918-09'),
('ww1', 'entente', 'Francja', '["France", "French Republic", "Francja", "Republika Francuska"]', '1914-07', '1918-11'),
('ww1', 'entente', 'Wielka Brytania', '["United Kingdom", "United Kingdom of Great Britain and Ireland", "Great Britain", "Wielka Brytania"]', '1914-08', '1918-11'),
('ww1', 'entente', 'Rosja', '["Russian Empire", "Russia", "Rosja", "Imperium Rosyjskie", "USSR"]', '1914-07', '1918-03'),
('ww1', 'entente', 'Serbia', '["Serbia", "Kingdom of Serbia", "Yugoslavia", "Jugosławia"]', '1914-07', '1918-11'),
('ww1', 'entente', 'Belgia', '["Belgium", "Belgia"]', '1914-08', '1918-11'),
('ww1', 'entente', 'Czarnogóra', '["Montenegro", "Kingdom of Montenegro", "Czarnogóra", "Królestwo Czarnogóry", "Yugoslavia", "Jugosławia"]', '1914-08', '1918-11'),
('ww1', 'entente', 'Japonia', '["Japan", "Empire of Japan", "Japonia"]', '1914-08', '1918-11'),
('ww1', 'entente', 'Włochy', '["Italy", "Włochy"]', '1915-05', '1918-11'),
('ww1', 'entente', 'Portugalia', '["Portugal", "Portugalia"]', '1916-03', '1918-11'),
('ww1', 'entente', 'Rumunia', '["Romania", "Rumunia"]', '1916-08', '1918-05'),
('ww1', 'entente', 'Grecja', '["Greece", "Kingdom of Greece", "Grecja", "Królestwo Grecji"]', '1917-06', '1918-11'),
('ww1', 'entente', 'Stany Zjednoczone', '["United States of America", "United States", "USA", "Stany Zjednoczone"]', '1917-04', '1918-11'),
('ww1', 'entente', 'Rumunia', '["Romania", "Rumunia"]', '1918-11', '1918-11')
ON CONFLICT (war, country, valid_from) DO UPDATE SET
    side = EXCLUDED.side,
    map_names = EXCLUDED.map_names,
    valid_to = EXCLUDED.valid_to;

INSERT INTO war_territorial_keyframes
    (war, month, front_longitudes, occupied_countries, note) VALUES
('ww1', '1914-07', '[20.8,20.5,19.5,19.0,22.5,25.0]', '[]', 'Linia graniczna przed rozpoczęciem działań'),
('ww1', '1914-12', '[22.0,21.5,20.5,20.0,22.8,25.2]', '[]', 'Stabilizacja frontu po walkach w Królestwie Polskim'),
('ww1', '1915-05', '[22.5,22.2,21.2,21.0,23.5,26.0]', '[]', 'Początek wielkiego odwrotu rosyjskiego'),
('ww1', '1915-08', '[24.0,24.0,23.2,23.5,25.5,28.0]', '[]', 'Zajęcie Warszawy i ziem Królestwa Polskiego'),
('ww1', '1915-10', '[25.5,26.0,25.0,26.0,27.5,29.0]', '["Serbia"]', 'Front od Rygi przez Polesie; kampania serbska'),
('ww1', '1916-01', '[25.5,26.0,25.0,26.0,27.5,29.0]', '["Serbia","Montenegro"]', 'Okupacja Serbii i Czarnogóry'),
('ww1', '1917-01', '[25.5,26.0,25.0,26.0,27.5,29.0]', '["Serbia","Montenegro","Romania"]', 'Państwa centralne kontrolują większość Rumunii'),
('ww1', '1917-12', '[25.5,26.0,25.0,26.0,27.5,29.0]', '["Serbia","Montenegro","Romania"]', 'Rozejm na froncie wschodnim'),
('ww1', '1918-03', '[28.0,28.5,29.0,31.0,34.0,36.0]', '["Serbia","Montenegro","Romania"]', 'Kontrola po traktacie brzeskim'),
('ww1', '1918-11', '[25.5,26.0,25.0,26.0,27.5,29.0]', '[]', 'Upadek państw centralnych')
ON CONFLICT (war, month) DO UPDATE SET
    front_longitudes = EXCLUDED.front_longitudes,
    occupied_countries = EXCLUDED.occupied_countries,
    note = EXCLUDED.note;

COMMIT;
