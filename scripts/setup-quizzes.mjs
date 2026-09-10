import "dotenv/config";
import { readFile } from "node:fs/promises";
import pg from "pg";

if (!process.env.DATABASE_URL) throw new Error("Brak zmiennej środowiskowej DATABASE_URL.");

const sql = await readFile(new URL("../database/quizzes.sql", import.meta.url), "utf8");
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});

try {
  await client.connect();
  await client.query(sql);
  console.log("Tabele i dane quizów zostały zapisane w bazie.");
} finally {
  await client.end();
}
