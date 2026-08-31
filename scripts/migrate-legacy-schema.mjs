import "dotenv/config";
import { readFile } from "node:fs/promises";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});

const client = await pool.connect();

try {
  await client.query("BEGIN");
  await client.query(`
    ALTER TABLE historical_events
      ADD COLUMN IF NOT EXISTS event_date date,
      ADD COLUMN IF NOT EXISTS place varchar(180),
      ADD COLUMN IF NOT EXISTS country varchar(120),
      ADD COLUMN IF NOT EXISTS longitude double precision,
      ADD COLUMN IF NOT EXISTS latitude double precision,
      ADD COLUMN IF NOT EXISTS external_id varchar(40)
  `);

  const { rows: legacyColumns } = await client.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'historical_events'
      AND column_name IN ('start_date', 'place_name', 'country_name', 'location')
  `);
  const columns = new Set(legacyColumns.map(({ column_name }) => column_name));

  if (columns.has("start_date")) {
    await client.query("UPDATE historical_events SET event_date = start_date WHERE event_date IS NULL");
  }
  if (columns.has("place_name")) {
    await client.query("UPDATE historical_events SET place = place_name WHERE place IS NULL");
  }
  if (columns.has("country_name")) {
    await client.query("UPDATE historical_events SET country = country_name WHERE country IS NULL");
  }
  if (columns.has("location")) {
    await client.query(`
      UPDATE historical_events
      SET longitude = ST_X(location::geometry), latitude = ST_Y(location::geometry)
      WHERE location IS NOT NULL AND (longitude IS NULL OR latitude IS NULL)
    `);
  }

  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS historical_events_external_id_idx
    ON historical_events (external_id) WHERE external_id IS NOT NULL
  `);
  await client.query("COMMIT");

  await client.query(await readFile(new URL("../database/countries.sql", import.meta.url), "utf8"));
  await client.query(await readFile(new URL("../database/war-alignments.sql", import.meta.url), "utf8"));

  console.log("Migracja bazy zakończona pomyślnie.");
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  throw error;
} finally {
  client.release();
  await pool.end();
}
