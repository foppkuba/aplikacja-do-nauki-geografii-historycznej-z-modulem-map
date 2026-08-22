import express from "express";
import { pool } from "./db.js";

const app = express();
const port = Number(process.env.PORT || 3000);

app.get("/api/events", async (request, response, next) => {
  try {
    const values = [];
    const conditions = ["event.status = 'published'", "event.location IS NOT NULL"];

    if (request.query.from) {
      values.push(request.query.from);
      conditions.push(`COALESCE(event.end_date, event.start_date) >= $${values.length}::date`);
    }
    if (request.query.to) {
      values.push(request.query.to);
      conditions.push(`event.start_date <= $${values.length}::date`);
    }
    if (request.query.category) {
      values.push(request.query.category);
      conditions.push(`category.slug = $${values.length}`);
    }

    const result = await pool.query(`
      SELECT
        event.id,
        event.legacy_id AS "legacyId",
        EXTRACT(YEAR FROM event.start_date)::integer AS year,
        event.display_date AS date,
        event.title,
        event.place_name AS place,
        event.country_name AS country,
        category.name AS category,
        CASE WHEN event.event_type = 'battle' THEN 'bitwa' ELSE 'wydarzenie' END AS type,
        event.description,
        ARRAY[ST_X(event.location::geometry), ST_Y(event.location::geometry)] AS coordinates
      FROM historical_events event
      LEFT JOIN event_categories category ON category.id = event.category_id
      WHERE ${conditions.join(" AND ")}
      ORDER BY event.start_date, event.title
    `, values);

    response.json({ events: result.rows });
  } catch (error) {
    next(error);
  }
});

app.get("/api/health", async (_request, response, next) => {
  try {
    await pool.query("SELECT 1");
    response.json({ status: "ok" });
  } catch (error) {
    next(error);
  }
});

app.use((error, _request, response, _next) => {
  void _next;
  console.error(error);
  response.status(500).json({ error: "Nie udało się pobrać danych z bazy." });
});

const server = app.listen(port, () => {
  console.log(`API działa pod adresem http://localhost:${port}`);
});

const shutdown = async () => {
  server.close();
  await pool.end();
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
