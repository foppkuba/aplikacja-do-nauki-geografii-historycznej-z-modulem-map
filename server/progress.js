import { Router } from 'express';
import { pool } from './db.js';
import { currentUser, verifyOrigin } from './auth.js';
import { historyLessons } from '../src/historyLessons.js';

export const progressRouter = Router();
progressRouter.use(async (request, response, next) => {
  try {
    request.account = await currentUser(request);
    if (!request.account) return response.status(401).json({ error: 'Zaloguj się, aby zapisywać i przeglądać postępy.' });
    return next();
  } catch (error) { return next(error); }
});

progressRouter.get('/', async (request, response, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, kind, slug, title, score, total, duration_seconds AS "durationSeconds",
             completed_at AS "completedAt"
      FROM learning_attempts WHERE user_id = $1 ORDER BY completed_at DESC, id
    `, [request.account.id]);
    const correct = rows.reduce((sum, row) => sum + row.score, 0);
    const answered = rows.reduce((sum, row) => sum + row.total, 0);
    const lessons = historyLessons.map((lesson) => {
      const attempts = rows.filter((row) => row.kind === 'lesson' && row.slug === lesson.slug);
      return { slug: lesson.slug, title: lesson.title, attempts: attempts.length,
        bestPercent: attempts.length ? Math.max(...attempts.map((row) => Math.round(100 * row.score / row.total))) : null };
    });
    return response.json({
      summary: { attempts: rows.length, completedLessons: lessons.filter((lesson) => lesson.attempts).length,
        totalLessons: lessons.length, accuracy: answered ? Math.round(100 * correct / answered) : null,
        durationSeconds: rows.reduce((sum, row) => sum + row.durationSeconds, 0) },
      lessons, recent: rows.slice(0, 10),
    });
  } catch (error) { return next(error); }
});

progressRouter.post('/attempts', verifyOrigin, async (request, response, next) => {
  try {
    const { id, kind, slug, answers, durationSeconds, accountId } = request.body || {};
    if (String(accountId) !== String(request.account.id)) {
      return response.status(409).json({ error: 'Konto zmieniło się podczas quizu. Rozpocznij nową próbę.' });
    }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id || '')
        || !['lesson', 'quiz'].includes(kind) || typeof slug !== 'string' || slug.length > 100
        || !Array.isArray(answers) || answers.length > 100
        || !Number.isInteger(durationSeconds) || durationSeconds < 0 || durationSeconds > 86400) {
      return response.status(400).json({ error: 'Nieprawidłowy wynik quizu.' });
    }
    // Network retries must never create another attempt or move it to another account.
    const existing = await pool.query('SELECT user_id, score, total FROM learning_attempts WHERE id = $1', [id]);
    if (existing.rowCount) {
      if (String(existing.rows[0].user_id) !== String(request.account.id)) return response.sendStatus(409);
      return response.json({ score: existing.rows[0].score, total: existing.rows[0].total });
    }
    let title;
    let questions;
    if (kind === 'lesson') {
      const lesson = historyLessons.find((item) => item.slug === slug);
      title = lesson?.title;
      questions = lesson?.quiz.questions;
    } else {
      const result = await pool.query(`
        SELECT c.name AS title, q.id, correct.id AS "correctAnswerId",
          (SELECT json_agg(json_build_object('id', a.id)) FROM quiz_answers a WHERE a.question_id = q.id) AS answers
        FROM quiz_categories c JOIN quiz_questions q ON q.category_id = c.id
        JOIN quiz_answers correct ON correct.question_id = q.id AND correct.is_correct
        WHERE c.slug = $1 ORDER BY q.sort_order, q.id
      `, [slug]);
      questions = result.rows;
      title = questions[0]?.title;
    }
    if (!questions?.length || !title) return response.status(404).json({ error: 'Nie znaleziono quizu.' });
    const selections = new Map(answers.map((answer) => [String(answer?.questionId), answer?.answerId]));
    if (answers.length !== questions.length || selections.size !== questions.length
        || questions.some((question) => !question.answers.some((answer) =>
          String(answer.id) === String(selections.get(String(question.id)))))) {
      return response.status(400).json({ error: 'Odpowiedz na wszystkie pytania przed zapisaniem wyniku.' });
    }
    const score = questions.filter((question) =>
      String(question.correctAnswerId) === String(selections.get(String(question.id)))).length;
    const saved = await pool.query(`
      INSERT INTO learning_attempts (id, user_id, kind, slug, title, score, total, duration_seconds)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO NOTHING RETURNING id
    `, [id, request.account.id, kind, slug, title, score, questions.length, durationSeconds]);
    if (!saved.rowCount) {
      const retry = await pool.query('SELECT user_id, score, total FROM learning_attempts WHERE id=$1', [id]);
      if (String(retry.rows[0].user_id) !== String(request.account.id)) return response.sendStatus(409);
      return response.json({ score: retry.rows[0].score, total: retry.rows[0].total });
    }
    return response.status(201).json({ score, total: questions.length });
  } catch (error) { return next(error); }
});
