import "dotenv/config";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const ENDPOINT = "https://qlever.dev/api/wikidata";
const FIRST_YEAR = 1800;
const LAST_YEAR = 2025;
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const WINDOWS = Array.from({ length: Math.ceil((LAST_YEAR - FIRST_YEAR + 1) / 10) }, (_, index) => ({
  from: FIRST_YEAR + index * 10,
  to: Math.min(LAST_YEAR + 1, FIRST_YEAR + (index + 1) * 10),
}));

const warMonths = new Set();
for (const [from, to] of [["1914-07", "1918-11"], ["1939-09", "1945-05"]]) {
  let [year, month] = from.split("-").map(Number);
  const [endYear, endMonth] = to.split("-").map(Number);
  while (year < endYear || (year === endYear && month <= endMonth)) {
    warMonths.add(`${year}-${String(month).padStart(2, "0")}`);
    month += 1;
    if (month === 13) { year += 1; month = 1; }
  }
}

const queryForWindow = (from, to) => `
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX schema: <http://schema.org/>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
SELECT DISTINCT ?item ?label ?description ?date ?coord ?sitelinks WHERE {
  ?item (wdt:P585|wdt:P580) ?date;
        wdt:P625 ?coord;
        wikibase:sitelinks ?sitelinks;
        rdfs:label ?label.
  FILTER(LANG(?label) = "pl")
  FILTER(?date >= "${from}-01-01T00:00:00Z"^^xsd:dateTime && ?date < "${to}-01-01T00:00:00Z"^^xsd:dateTime)
  OPTIONAL { ?item schema:description ?description. FILTER(LANG(?description) = "pl") }
}
ORDER BY DESC(?sitelinks)
LIMIT 1500`;

const getValue = (binding, key) => binding[key]?.value ?? "";
const parsePoint = (value) => {
  const match = /^Point\((-?[\d.]+) (-?[\d.]+)\)$/i.exec(value);
  return match ? [Number(match[1]), Number(match[2])] : null;
};
const inEurope = ([longitude, latitude]) => longitude >= -25 && longitude <= 45 && latitude >= 34 && latitude <= 72;
const ignored = /sezon|liga|turniej|mistrzostw|wyścig|nagrod[ay]|zaćmieni|asteroid|planetoid|kometa|album|film|odcinek/i;
const preferred = /bitw|wojn|powstani|rewolucj|traktat|zamach|katastrof|wybor|niepodleg|koronacj|konferencj|oblężeni|inwazj|operacj|masakr|protest|kryzys|referendum|pucz|epidem/i;

const score = (event) => event.sitelinks + (preferred.test(event.label) ? 1000 : 0) - (ignored.test(event.label) ? 2000 : 0);
const nearestCountry = (event, countries) => {
  const active = countries.filter((country) => event.year >= country.validFrom && event.year <= country.validTo);
  return active.reduce((nearest, country) => {
    const latitudeScale = Math.cos(event.latitude * Math.PI / 180);
    const distance = ((event.longitude - country.longitude) * latitudeScale) ** 2
      + (event.latitude - country.latitude) ** 2;
    return !nearest || distance < nearest.distance ? { ...country, distance } : nearest;
  }, null)?.name ?? "Europa";
};

const fetchWindow = async ({ from, to }, attempt = 1) => {
  const url = `${ENDPOINT}?query=${encodeURIComponent(queryForWindow(from, to))}`;
  const response = await fetch(url, { headers: { Accept: "application/sparql-results+json" } });
  if (response.status === 429 && attempt <= 6) {
    const delay = attempt * 5000;
    console.log(`limit zapytań, ponowienie za ${delay / 1000} s`);
    await wait(delay);
    return fetchWindow({ from, to }, attempt + 1);
  }
  if (!response.ok) throw new Error(`QLever ${from}-${to - 1}: HTTP ${response.status}`);
  const payload = await response.json();
  return payload.results.bindings.flatMap((binding) => {
    const coordinates = parsePoint(getValue(binding, "coord"));
    const date = getValue(binding, "date").slice(0, 10);
    if (!coordinates || !inEurope(coordinates) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
    const [longitude, latitude] = coordinates;
    return [{
      externalId: getValue(binding, "item").split("/").pop(),
      label: getValue(binding, "label"),
      description: getValue(binding, "description"),
      date,
      year: Number(date.slice(0, 4)),
      month: date.slice(0, 7),
      longitude,
      latitude,
      sitelinks: Number(getValue(binding, "sitelinks")) || 0,
    }];
  });
};

const main = async () => {
  await pool.query("ALTER TABLE historical_events ADD COLUMN IF NOT EXISTS external_id varchar(40)");
  await pool.query("CREATE UNIQUE INDEX IF NOT EXISTS historical_events_external_id_idx ON historical_events (external_id) WHERE external_id IS NOT NULL");
  const countriesResult = await pool.query(`
    SELECT name, valid_from AS "validFrom", valid_to AS "validTo", longitude, latitude
    FROM country_periods
  `);
  const { rows: columns } = await pool.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'historical_events'
  `);
  const hasLegacySchema = columns.some(({ column_name }) => column_name === "start_date");

  const allEvents = [];
  for (const window of WINDOWS) {
    process.stdout.write(`Pobieranie ${window.from}-${window.to - 1}... `);
    const events = await fetchWindow(window);
    allEvents.push(...events);
    console.log(`${events.length} kandydatów`);
    await wait(1000);
  }

  const selected = new Map();
  for (const event of allEvents.sort((a, b) => score(b) - score(a))) {
    if (ignored.test(event.label)) continue;
    const yearKey = `year:${event.year}`;
    if (!selected.has(yearKey)) selected.set(yearKey, event);
    if (warMonths.has(event.month)) {
      const monthKey = `month:${event.month}`;
      if (!selected.has(monthKey)) selected.set(monthKey, event);
    }
  }

  const uniqueEvents = [...new Map([...selected.values()].map((event) => [event.externalId, event])).values()];
  let inserted = 0;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const event of uniqueEvents) {
      const country = nearestCountry(event, countriesResult.rows);
      const category = /bitw|wojn|oblężeni|inwazj|operacj|powstani|masakr/i.test(event.label) ? "Wojna" : "Polityka";
      const description = event.description
        ? `${event.label} — ${event.description}.`
        : `${event.label} — wydarzenie historyczne odnotowane w Wikidata.`;
      const result = await client.query(`
        INSERT INTO historical_events
          (title, description, category_id, event_date, place, country, longitude, latitude, external_id
           ${hasLegacySchema ? ", slug, event_type, start_date, display_date, place_name, country_name, location, status, published_at" : ""})
        SELECT $1::text, $2::text, category.id, $3::date, $4::text, $5::text,
               $6::double precision, $7::double precision, $8::text
          ${hasLegacySchema ? `, 'wikidata-' || $8, CASE WHEN $1 ~* '^bitwa' THEN 'battle' ELSE 'political' END,
            $3::date, $3::text, $4, $5, ST_SetSRID(ST_MakePoint($6, $7), 4326), 'published', now()` : ""}
        FROM event_categories category WHERE category.name = $9
        ON CONFLICT (external_id) WHERE external_id IS NOT NULL DO NOTHING
        RETURNING id
      `, [event.label, description, event.date, event.label, country, event.longitude, event.latitude, event.externalId, category]);
      const eventId = result.rows[0]?.id;
      if (eventId) {
        inserted += 1;
        await client.query(
          "INSERT INTO event_sources (event_id, title, url) VALUES ($1, $2, $3)",
          [eventId, "Wikidata", `https://www.wikidata.org/wiki/${event.externalId}`],
        );
      }
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  const coverage = await pool.query(`
    WITH years AS (SELECT generate_series(1800, 2025) AS year),
    months AS (
      SELECT generate_series(DATE '1914-07-01', DATE '1918-11-01', INTERVAL '1 month')::date AS month
      UNION ALL
      SELECT generate_series(DATE '1939-09-01', DATE '1945-05-01', INTERVAL '1 month')::date
    )
    SELECT
      (SELECT array_agg(year) FROM years y WHERE NOT EXISTS (
        SELECT 1 FROM historical_events e WHERE EXTRACT(YEAR FROM e.event_date) = y.year
      )) AS missing_years,
      (SELECT array_agg(TO_CHAR(month, 'YYYY-MM')) FROM months m WHERE NOT EXISTS (
        SELECT 1 FROM historical_events e WHERE DATE_TRUNC('month', e.event_date) = m.month
      )) AS missing_months
  `);
  console.log(`Dodano ${inserted} wydarzeń.`);
  console.log("Brakujące lata:", coverage.rows[0].missing_years ?? "brak");
  console.log("Brakujące miesiące wojen:", coverage.rows[0].missing_months ?? "brak");
};

try {
  await main();
} finally {
  await pool.end();
}
