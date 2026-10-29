import express from "express";
import { fileURLToPath } from "node:url";
import { pool } from "./db.js";
import { authRouter } from "./auth.js";
import { progressRouter } from "./progress.js";

const app = express();
const port = Number(process.env.PORT || 3000);

// Enable only when the API is reachable exclusively through our reverse proxy.
if (process.env.TRUST_PROXY === "1") app.set("trust proxy", 1);

app.use(express.json());
app.disable("x-powered-by");
app.use("/api/auth", authRouter);
app.use("/api/progress", progressRouter);

app.get("/api/quizzes/categories", async (_request, response, next) => {
  try {
    const result = await pool.query(`
      SELECT category.slug, category.name, category.description,
             COUNT(question.id)::integer AS "questionCount"
      FROM quiz_categories category
      LEFT JOIN quiz_questions question ON question.category_id = category.id
      GROUP BY category.id
      HAVING COUNT(question.id) > 0
      ORDER BY category.sort_order, category.name
    `);
    response.json({ categories: result.rows });
  } catch (error) {
    next(error);
  }
});

app.get("/api/quizzes/:category", async (request, response, next) => {
  try {
    const categoryResult = await pool.query(`
      SELECT id, slug, name, description
      FROM quiz_categories
      WHERE slug = $1
    `, [request.params.category]);
    if (!categoryResult.rowCount) {
      return response.status(404).json({ error: "Nie znaleziono kategorii quizu." });
    }

    const category = categoryResult.rows[0];
    const questionsResult = await pool.query(`
      SELECT question.id, question.prompt,
             json_agg(json_build_object('id', answer.id, 'text', answer.answer_text)
               ORDER BY answer.sort_order, answer.id) AS answers
      FROM quiz_questions question
      JOIN quiz_answers answer ON answer.question_id = question.id
      WHERE question.category_id = $1
      GROUP BY question.id
      ORDER BY question.sort_order, question.id
    `, [category.id]);
    return response.json({
      category: { slug: category.slug, name: category.name, description: category.description },
      questions: questionsResult.rows,
    });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/quizzes/answer", async (request, response, next) => {
  try {
    const questionId = Number(request.body?.questionId);
    const answerId = Number(request.body?.answerId);
    if (!Number.isInteger(questionId) || !Number.isInteger(answerId)) {
      return response.status(400).json({ error: "Nieprawidłowe pytanie lub odpowiedź." });
    }
    const result = await pool.query(`
      SELECT selected.is_correct AS "isCorrect",
             correct.id AS "correctAnswerId", question.explanation
      FROM quiz_answers selected
      JOIN quiz_questions question ON question.id = selected.question_id
      JOIN quiz_answers correct ON correct.question_id = question.id AND correct.is_correct
      WHERE selected.id = $1 AND selected.question_id = $2
    `, [answerId, questionId]);
    if (!result.rowCount) {
      return response.status(404).json({ error: "Nie znaleziono odpowiedzi dla tego pytania." });
    }
    return response.json(result.rows[0]);
  } catch (error) {
    return next(error);
  }
});

app.get("/api/events", async (request, response, next) => {
  try {
    const values = [];
    const conditions = [];

    if (request.query.from) {
      values.push(request.query.from);
      conditions.push(`event.event_date >= $${values.length}::date`);
    }
    if (request.query.to) {
      values.push(request.query.to);
      conditions.push(`event.event_date <= $${values.length}::date`);
    }
    if (request.query.category) {
      values.push(request.query.category);
      conditions.push(`LOWER(category.name) = LOWER($${values.length})`);
    }

    const result = await pool.query(`
      SELECT
        event.id,
        EXTRACT(YEAR FROM event.event_date)::integer AS year,
        TO_CHAR(event.event_date, 'YYYY-MM-DD') AS date,
        event.title,
        event.place,
        event.country,
        category.name AS category,
        CASE WHEN LOWER(event.title) LIKE 'bitwa%' THEN 'bitwa' ELSE 'wydarzenie' END AS type,
        event.description,
        ARRAY[event.longitude, event.latitude] AS coordinates
      FROM historical_events event
      LEFT JOIN event_categories category ON category.id = event.category_id
      WHERE event.longitude IS NOT NULL
        AND event.latitude IS NOT NULL
        ${conditions.length ? `AND ${conditions.join(" AND ")}` : ""}
      ORDER BY event.event_date, event.title
    `, values);

    response.json({ events: result.rows });
  } catch (error) {
    next(error);
  }
});

app.get("/api/countries", async (request, response, next) => {
  try {
    const year = Number(request.query.year);
    if (!Number.isInteger(year) || year < 1800 || year > 2025) {
      return response.status(400).json({ error: "Parametr year musi być rokiem z zakresu 1800–2025." });
    }

    const result = await pool.query(`
      SELECT name, valid_from AS "validFrom", valid_to AS "validTo",
             longitude, latitude, zoom
      FROM country_periods
      WHERE $1 BETWEEN valid_from AND valid_to
      ORDER BY name
    `, [year]);

    return response.json({ countries: result.rows });
  } catch (error) {
    return next(error);
  }
});

app.get("/api/war-alignments", async (request, response, next) => {
  try {
    const { war, month } = request.query;
    if (war !== "ww1" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month ?? "")) {
      return response.status(400).json({ error: "Nieprawidłowa wojna lub miesiąc." });
    }

    const result = await pool.query(`
      SELECT side, country, map_names AS "mapNames", valid_from AS "validFrom", valid_to AS "validTo"
      FROM war_country_alignments
      WHERE war = $1 AND $2 BETWEEN valid_from AND valid_to
      ORDER BY side, country
    `, [war, month]);

    return response.json({ alignments: result.rows });
  } catch (error) {
    return next(error);
  }
});

app.get("/api/war-territorial-keyframes", async (request, response, next) => {
  try {
    if (request.query.war !== "ww1") {
      return response.status(400).json({ error: "Nieprawidłowa wojna." });
    }
    const result = await pool.query(`
      SELECT month, front_longitudes AS "frontLongitudes",
             occupied_countries AS "occupiedCountries", note
      FROM war_territorial_keyframes
      WHERE war = $1
      ORDER BY month
    `, [request.query.war]);
    return response.json({ keyframes: result.rows });
  } catch (error) {
    return next(error);
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

app.use("/api", (_request, response) => {
  response.status(404).json({ error: "Nie znaleziono endpointu API." });
});

if (process.env.NODE_ENV === "production") {
  app.use(express.static(fileURLToPath(new URL("../dist/", import.meta.url))));
}

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
