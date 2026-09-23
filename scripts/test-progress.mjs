import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import test from 'node:test';
import express from 'express';
import { pool } from '../server/db.js';
import { progressRouter } from '../server/progress.js';
import { historyLessons } from '../src/historyLessons.js';

// Integration test against DATABASE_URL; only newly created test accounts are removed.
test('account progress: validation, scoring, persistence, retries and isolation', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/progress', progressRouter);
  app.use((error, request, response, next) => {
    void request; void next;
    response.status(500).json({ error: error.message });
  });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}/api/progress`;
  const accounts = [];
  try {
    for (let i = 0; i < 2; i += 1) {
      const { rows } = await pool.query(`
        INSERT INTO users (email, display_name, password_hash)
        VALUES ($1, 'Progress test', 'unusable-test-password') RETURNING id
      `, [`progress-test-${randomUUID()}@example.invalid`]);
      const account = { id: rows[0].id, token: randomUUID() };
      accounts.push(account);
      await pool.query(`INSERT INTO user_sessions (user_id, token_hash, expires_at)
        VALUES ($1, $2, now() + interval '10 minutes')`,
      [account.id, createHash('sha256').update(account.token).digest('hex')]);
    }
    const request = (account, body, extraHeaders = {}) => fetch(base + (body ? '/attempts' : '/'), {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json',
        ...(account ? { Cookie: `chronomap_session=${account.token}` } : {}), ...extraHeaders },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const getStats = async (account) => {
      const response = await request(account);
      assert.equal(response.status, 200);
      return response.json();
    };
    const lesson = historyLessons[0];
    const attempt = { id: randomUUID(), accountId: accounts[0].id, kind: 'lesson',
      slug: lesson.slug, durationSeconds: 37,
      answers: lesson.quiz.questions.map((question) => ({ questionId: question.id, answerId: question.correctAnswerId })) };
    assert.equal((await request(null)).status, 401);
    assert.equal((await request(null, attempt)).status, 401);
    assert.equal((await getStats(accounts[0])).summary.attempts, 0);
    assert.equal((await request(accounts[0], attempt, { Origin: 'https://untrusted.invalid' })).status, 403);
    assert.equal((await request(accounts[1], attempt)).status, 409);
    assert.equal((await request(accounts[0], { ...attempt, answers: attempt.answers.slice(1) })).status, 400);
    assert.equal((await request(accounts[0], { ...attempt, answers: attempt.answers.map(() => attempt.answers[0]) })).status, 400);
    assert.equal((await request(accounts[0], { ...attempt, durationSeconds: -1 })).status, 400);
    assert.equal((await request(accounts[0], { ...attempt, slug: 'missing-lesson' })).status, 404);
    const responses = await Promise.all([request(accounts[0], attempt), request(accounts[0], attempt)]);
    assert.deepEqual(responses.map((response) => response.status).sort(), [200, 201]);
    let stats = await getStats(accounts[0]);
    assert.equal(stats.summary.attempts, 1);
    assert.equal(stats.summary.completedLessons, 1);
    assert.equal(stats.summary.accuracy, 100);
    assert.equal(stats.summary.durationSeconds, 37);
    assert.equal(stats.lessons[0].bestPercent, 100);
    assert.equal((await getStats(accounts[1])).recent.length, 0);
    assert.equal((await request(accounts[1], { ...attempt, accountId: accounts[1].id })).status, 409);

    const wrong = { ...attempt, id: randomUUID(), score: 999, answers: lesson.quiz.questions.map((question) => ({
      questionId: question.id, answerId: question.answers.find((answer) => answer.id !== question.correctAnswerId).id,
    })) };
    const wrongResponse = await request(accounts[0], wrong);
    assert.equal(wrongResponse.status, 201);
    assert.equal((await wrongResponse.json()).score, 0);
    stats = await getStats(accounts[0]);
    assert.equal(stats.summary.accuracy, 50);
    assert.equal(stats.summary.completedLessons, 1);
    assert.equal(stats.lessons[0].bestPercent, 100);

    const { rows: quiz } = await pool.query(`
      SELECT c.slug, q.id, a.id AS answer_id FROM quiz_categories c
      JOIN quiz_questions q ON q.category_id = c.id
      JOIN quiz_answers a ON a.question_id = q.id AND a.is_correct
      WHERE c.id = (SELECT category_id FROM quiz_questions ORDER BY id LIMIT 1)
    `);
    assert.ok(quiz.length, 'Run npm run db:quizzes before testing category quizzes');
    const categoryAttempt = { ...attempt, id: randomUUID(), kind: 'quiz', slug: quiz[0].slug,
      answers: quiz.map((question) => ({ questionId: question.id, answerId: question.answer_id })) };
    assert.equal((await request(accounts[0], categoryAttempt)).status, 201);
    stats = await getStats(accounts[0]);
    assert.equal(stats.summary.attempts, 3);
    assert.equal(stats.recent[0].kind, 'quiz');
    assert.equal(stats.recent[0].score, quiz.length);
    assert.equal(stats.summary.completedLessons, 1);
    assert.equal((await pool.query('SELECT count(*)::int AS count FROM learning_attempts WHERE user_id=$1', [accounts[0].id])).rows[0].count, 3);
  } finally {
    for (const account of accounts) await pool.query('DELETE FROM users WHERE id=$1', [account.id]);
    await new Promise((resolve) => server.close(resolve));
    await pool.end();
  }
});
