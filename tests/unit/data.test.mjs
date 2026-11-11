import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { historyLessons } from '../../src/historyLessons.js';
import { lessonMapLinks } from '../../src/lessonMapLinks.js';
import { restoreSnapshot } from '../../scripts/event-snapshot.mjs';

// Testy czytają pliki projektu. Nie potrzebują API ani połączenia z bazą.
async function readEventSnapshot() {
  const fileUrl = new URL('../../database/events.snapshot.json', import.meta.url);
  const fileContents = await readFile(fileUrl, 'utf8');
  return JSON.parse(fileContents);
}

test('DAT-01 | Siedem lekcji ma unikalne identyfikatory i kompletny materiał', () => {
  const lessonSlugs = historyLessons.map(lesson => lesson.slug);
  const uniqueSlugs = new Set(lessonSlugs);
  const requiredFields = ['title', 'summary', 'period', 'takeaway'];

  assert.equal(historyLessons.length, 7);
  assert.equal(uniqueSlugs.size, historyLessons.length);

  for (const lesson of historyLessons) {
    for (const field of requiredFields) {
      assert.ok(lesson[field]?.trim());
    }

    assert.ok(['XIX', 'XX', 'XXI'].includes(lesson.century));
    assert.ok(lesson.sections.length && lesson.dates.length);

    const contentPairs = [...lesson.sections, ...lesson.dates];
    for (const pair of contentPairs) {
      assert.equal(pair.length, 2);
      assert.ok(pair.every(text => text.trim()));
    }
  }
});

test('DAT-02 | Każdy quiz lekcji ma trzy pytania i jedną wskazaną poprawną odpowiedź', () => {
  const questionIds = new Set();

  for (const lesson of historyLessons) {
    assert.equal(lesson.quiz.category.slug, lesson.slug);
    assert.equal(lesson.quiz.questions.length, 3);

    for (const question of lesson.quiz.questions) {
      assert.ok(!questionIds.has(question.id));
      questionIds.add(question.id);

      assert.ok(question.prompt.trim() && question.explanation.trim());
      assert.equal(question.answers.length, 4);

      const answerIds = question.answers.map(answer => answer.id);
      assert.equal(new Set(answerIds).size, 4);

      const correctAnswers = question.answers.filter(answer => (
        answer.id === question.correctAnswerId
      ));
      assert.equal(correctAnswers.length, 1);
      assert.ok(question.answers.every(answer => answer.text.trim()));
    }
  }
});

test('DAT-03 | Odnośniki wszystkich lekcji prowadzą do dat obsługiwanych przez mapę', () => {
  const linkedLessonSlugs = Object.keys(lessonMapLinks).sort();
  const existingLessonSlugs = historyLessons.map(lesson => lesson.slug).sort();

  assert.deepEqual(linkedLessonSlugs, existingLessonSlugs);

  for (const link of Object.values(lessonMapLinks)) {
    assert.ok(link.stops.length);

    for (const stop of link.stops) {
      assert.match(stop.date, /^\d{4}(-(0[1-9]|1[0-2]))?$/);

      const year = Number(stop.date.slice(0, 4));
      const isInMapRange = year >= 1800 && year <= 2025;
      const isInLessonRange = year >= link.years[0] && year <= link.years[1];

      assert.ok(isInMapRange && isInLessonRange);
      assert.ok(stop.label.trim());
    }
  }
});

test('DAT-04 | Eksport wydarzeń ma poprawne daty, współrzędne i adresy istniejących źródeł', async () => {
  const snapshot = await readEventSnapshot();
  const externalIds = snapshot.events
    .map(item => item.event.external_id)
    .filter(Boolean);

  assert.equal(snapshot.formatVersion, 1);
  assert.equal(snapshot.events.length, 333);
  assert.equal(new Set(externalIds).size, externalIds.length);

  for (const { event, category, sources } of snapshot.events) {
    assert.ok(event.title.trim() && event.description.trim());
    assert.match(event.event_date, /^\d{4}-\d{2}-\d{2}$/);

    const parsedDate = new Date(event.event_date).toISOString().slice(0, 10);
    assert.equal(parsedDate, event.event_date);

    const validLongitude = Number.isFinite(event.longitude) && Math.abs(event.longitude) <= 180;
    const validLatitude = Number.isFinite(event.latitude) && Math.abs(event.latitude) <= 90;

    assert.ok(validLongitude);
    assert.ok(validLatitude);
    assert.ok(category?.name && Array.isArray(sources));

    for (const source of sources) {
      const protocol = new URL(source.url).protocol;
      assert.ok(['http:', 'https:'].includes(protocol));
    }

    for (const field of ['id', 'created_by', 'updated_by']) {
      assert.ok(!Object.hasOwn(event, field));
    }
  }
});

test('DAT-06 | Każde wydarzenie w eksporcie ma przypisane źródło', async () => {
  const snapshot = await readEventSnapshot();
  const eventsWithoutSources = snapshot.events.filter(item => item.sources.length === 0);
  const missingTitles = eventsWithoutSources.map(item => item.event.title);

  // Nie pomijamy brakujących źródeł: to celowo zgłaszany błąd jakości danych.
  assert.equal(
    missingTitles.length,
    0,
    `Brak źródeł dla ${missingTitles.length}/333 wydarzeń: ${missingTitles.join('; ')}`,
  );
});

test('DAT-05 | Odtwarzanie odrzuca pusty lub nieobsługiwany eksport przed zapytaniem SQL', async () => {
  const databaseClient = {
    query() {
      assert.fail('Nie powinno być zapytania SQL');
    },
  };
  const invalidSnapshots = [
    {},
    { formatVersion: 2, events: [{}] },
    { formatVersion: 1, events: [] },
  ];

  for (const snapshot of invalidSnapshots) {
    await assert.rejects(
      restoreSnapshot(databaseClient, snapshot),
      /Nieprawidłowy lub pusty/,
    );
  }
});
