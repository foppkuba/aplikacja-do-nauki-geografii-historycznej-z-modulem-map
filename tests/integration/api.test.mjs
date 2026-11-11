import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createTestEnvironment } from '../helpers/database.mjs';
import { historyLessons } from '../../src/historyLessons.js';
import { readSnapshot, restoreSnapshot } from '../../scripts/event-snapshot.mjs';

// Każdy test: przygotowanie danych → wywołanie API → sprawdzenie wyniku.
// assert.equal porównuje wartości, deepEqual także zawartość obiektów,
// ok sprawdza warunek, a rejects oczekuje błędu operacji asynchronicznej.
//
// Scenariusze wykonują się kolejno i korzystają ze wspólnej testowej bazy.
// Konto powstaje w AUT-02, quiz w QUI-01, a pierwsza próba w PRG-02.
let environment;
let requestApi;
let primaryAccount;
let primaryCookie;
let otherAccount;
let lessonAttempt;
let categoryQuiz;

const password = 'Testowe-haslo-12345';
const lesson = historyLessons[0];
const correctAnswers = lesson.quiz.questions.map(question => ({
  questionId: question.id,
  answerId: question.correctAnswerId,
}));

before(async () => {
  environment = await createTestEnvironment();
  requestApi = environment.request;

  // Drugie konto służy do sprawdzania, czy użytkownicy mają oddzielne wyniki.
  const accountResult = await environment.pool.query(
    `INSERT INTO users(email, display_name, password_hash)
     VALUES ($1, 'Drugie konto', 'unusable')
     RETURNING id`,
    [`other-${randomUUID()}@example.invalid`],
  );
  const sessionToken = randomUUID();
  const tokenHash = createHash('sha256').update(sessionToken).digest('hex');

  otherAccount = {
    id: accountResult.rows[0].id,
    cookie: `chronomap_session=${sessionToken}`,
  };

  await environment.pool.query(
    `INSERT INTO user_sessions(user_id, token_hash, expires_at)
     VALUES ($1, $2, now() + interval '1 hour')`,
    [otherAccount.id, tokenHash],
  );
}, { timeout: 30000 });

after(async () => {
  if (environment) {
    await environment.cleanup();
  }
});

async function readProgress(sessionCookie = primaryCookie) {
  const response = await requestApi('/api/progress/', { cookie: sessionCookie });
  assert.equal(response.status, 200);

  return response.json();
}

function saveProgress(attempt, sessionCookie = primaryCookie, headers = {}) {
  return requestApi('/api/progress/attempts', {
    body: attempt,
    cookie: sessionCookie,
    headers,
  });
}

// WYDARZENIA, PAŃSTWA I DANE WOJENNE

test('EVT-01 | API i połączenie z PostgreSQL działają', async () => {
  const response = await requestApi('/api/health');
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(result, { status: 'ok' });
  assert.equal(response.headers.get('x-powered-by'), null);
});

test('EVT-02 | API zwraca 333 wydarzenia z datami, kategoriami i współrzędnymi', async () => {
  const response = await requestApi('/api/events');
  const { events } = await response.json();

  assert.equal(response.status, 200);
  assert.equal(events.length, 333);

  for (const event of events) {
    assert.match(event.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(event.year, Number(event.date.slice(0, 4)));
    assert.ok(event.coordinates.every(Number.isFinite));
    assert.ok(event.category && event.title && event.description);
  }

  const dates = events.map(event => event.date);
  const sortedDates = [...dates].sort();
  assert.deepEqual(dates, sortedDates);
});

test('EVT-03 | Zakres dat jest domknięty i łączy się z kategorią', async () => {
  // Przygotowanie: wybieramy istniejące wydarzenie z kategorii Wojna.
  const allEventsResponse = await requestApi('/api/events');
  const allEvents = await allEventsResponse.json();
  const selectedEvent = allEvents.events.find(event => event.category === 'Wojna');

  // Wykonanie: początek i koniec zakresu są datą tego wydarzenia.
  const response = await requestApi(
    `/api/events?from=${selectedEvent.date}&to=${selectedEvent.date}&category=wojna`,
  );
  const { events } = await response.json();

  // Sprawdzenie: data graniczna jest uwzględniona, a filtr kategorii działa.
  assert.equal(response.status, 200);
  assert.ok(events.some(event => event.id === selectedEvent.id));
  assert.ok(events.every(event => (
    event.date === selectedEvent.date && event.category === 'Wojna'
  )));
});

test('EVT-04 | Nieistniejąca kategoria i próba SQL injection zwracają pustą listę', async () => {
  const maliciousCategory = encodeURIComponent("' OR 1=1 --");

  const response = await requestApi(`/api/events?category=${maliciousCategory}`);
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(result, { events: [] });
});

test('EVT-05 | Nieprawidłowe daty i odwrócony zakres dają 400', async () => {
  const invalidQueries = [
    'from=abc',
    'from=1939-02-30',
    'to=1939-13-01',
    'from=1940-01-01&to=1939-01-01',
    'from=1939-01-01&from=1940-01-01',
  ];

  for (const query of invalidQueries) {
    const response = await requestApi(`/api/events?${query}`);
    assert.equal(response.status, 400, query);
  }
});

test('EVT-06 | Lista państw respektuje granice zakresu lat', async () => {
  const validYears = [1800, 1939, 2025];
  const invalidYears = ['1799', '2026', '1939.5', 'abc', ''];

  for (const year of validYears) {
    const response = await requestApi(`/api/countries?year=${year}`);
    const { countries } = await response.json();

    assert.equal(response.status, 200);
    assert.ok(countries.length);
    assert.ok(countries.every(country => (
      country.validFrom <= year && country.validTo >= year
    )));
  }

  for (const year of invalidYears) {
    const response = await requestApi(`/api/countries?year=${year}`);
    assert.equal(response.status, 400);
  }
});

test('EVT-07 | Strony I wojny zmieniają się zgodnie z datą przystąpienia USA', async () => {
  const marchResponse = await requestApi('/api/war-alignments?war=ww1&month=1917-03');
  const aprilResponse = await requestApi('/api/war-alignments?war=ww1&month=1917-04');
  const march = await marchResponse.json();
  const april = await aprilResponse.json();

  const usaBeforeJoining = march.alignments.some(country => (
    country.country === 'Stany Zjednoczone'
  ));
  const usaInEntente = april.alignments.some(country => (
    country.country === 'Stany Zjednoczone' && country.side === 'entente'
  ));

  assert.equal(usaBeforeJoining, false);
  assert.equal(usaInEntente, true);
  assert.ok(april.alignments.every(country => Array.isArray(country.mapNames)));
});

test('EVT-08 | API wojny odrzuca nieobsługiwaną wojnę i błędny miesiąc', async () => {
  const invalidQueries = [
    'war=ww2&month=1914-07',
    'war=ww1&month=1914-13',
    'war=ww1&month=1914-7',
    'war=ww1',
  ];

  for (const query of invalidQueries) {
    const response = await requestApi(`/api/war-alignments?${query}`);
    assert.equal(response.status, 400);
  }

  const response = await requestApi('/api/war-territorial-keyframes?war=ww2');
  assert.equal(response.status, 400);
});

test('EVT-09 | Klatki frontu I wojny są uporządkowane i zawierają sześć długości', async () => {
  const response = await requestApi('/api/war-territorial-keyframes?war=ww1');
  const { keyframes } = await response.json();

  assert.equal(response.status, 200);
  assert.ok(keyframes.length > 1);

  const months = keyframes.map(frame => frame.month);
  assert.deepEqual(months, [...months].sort());
  assert.ok(keyframes.every(frame => (
    frame.frontLongitudes.length === 6
    && frame.frontLongitudes.every(Number.isFinite)
  )));
});

test('EVT-10 | Uszkodzony JSON żądania zwraca 400 zamiast błędu bazy', async () => {
  const response = await requestApi('/api/quizzes/answer', {
    method: 'POST',
    raw: '{bad',
  });
  const result = await response.json();

  assert.equal(response.status, 400);
  assert.ok(result.error);
});

// QUIZY KATEGORII

test('QUI-01 | Kategorie quizów mają pytania, a API nie ujawnia klucza odpowiedzi', async () => {
  const categoriesResponse = await requestApi('/api/quizzes/categories');
  const { categories } = await categoriesResponse.json();

  assert.equal(categoriesResponse.status, 200);
  assert.ok(categories.length >= 6);
  assert.ok(categories.every(category => category.questionCount > 0));

  const selectedCategory = categories[0];
  const quizResponse = await requestApi(`/api/quizzes/${selectedCategory.slug}`);
  categoryQuiz = await quizResponse.json();

  assert.equal(categoryQuiz.questions.length, selectedCategory.questionCount);

  for (const question of categoryQuiz.questions) {
    assert.equal(question.answers.length, 4);
    assert.equal(question.correctAnswerId, undefined);
    assert.equal(question.explanation, undefined);
    assert.ok(question.answers.every(answer => (
      answer.is_correct === undefined && answer.isCorrect === undefined
    )));
  }
});

test('QUI-02 | Nieistniejący quiz zwraca 404', async () => {
  const response = await requestApi('/api/quizzes/missing-category');
  assert.equal(response.status, 404);
});

test('QUI-03 | Poprawna i błędna odpowiedź są oceniane na serwerze z wyjaśnieniem', async () => {
  const question = categoryQuiz.questions[0];
  const answersResult = await environment.pool.query(
    `SELECT id, question_id, is_correct
     FROM quiz_answers
     WHERE question_id = $1
     ORDER BY sort_order`,
    [question.id],
  );
  const answers = answersResult.rows;
  const correctAnswer = answers.find(answer => answer.is_correct);

  for (const answer of answers) {
    const response = await requestApi('/api/quizzes/answer', {
      body: {
        questionId: answer.question_id,
        answerId: answer.id,
      },
    });
    const result = await response.json();

    assert.equal(response.status, 200);
    assert.equal(result.isCorrect, answer.is_correct);
    assert.ok(result.explanation);
    assert.equal(String(result.correctAnswerId), String(correctAnswer.id));
  }
});

test('QUI-04 | Odpowiedź innego pytania jest odrzucana', async () => {
  const firstQuestion = categoryQuiz.questions[0];
  const answerFromOtherQuestion = categoryQuiz.questions[1].answers[0];

  const response = await requestApi('/api/quizzes/answer', {
    body: {
      questionId: firstQuestion.id,
      answerId: answerFromOtherQuestion.id,
    },
  });

  assert.equal(response.status, 404);
});

test('QUI-05 | Nieprawidłowe identyfikatory odpowiedzi zwracają 400', async () => {
  const invalidIdentifiers = [
    null, '', 0, -1, 1.5, true, [], {}, 'abc', Number.MAX_SAFE_INTEGER + 1,
  ];

  for (const identifier of invalidIdentifiers) {
    const response = await requestApi('/api/quizzes/answer', {
      body: { questionId: identifier, answerId: identifier },
    });

    assert.equal(response.status, 400, JSON.stringify(identifier));
  }
});

// KONTA I SESJE

test('AUT-01 | Rejestracja odrzuca błędny e-mail, nazwę i hasło', async () => {
  const validAccount = { email: 'test@example.invalid', displayName: 'Tester', password };
  const invalidChanges = [
    { email: 'invalid' },
    { displayName: 'A' },
    { password: 'short' },
    { password: 'x'.repeat(129) },
  ];

  for (const change of invalidChanges) {
    const response = await requestApi('/api/auth/register', {
      body: { ...validAccount, ...change },
    });

    assert.equal(response.status, 400);
  }
});

test('AUT-02 | Rejestracja normalizuje e-mail, haszuje hasło i tworzy bezpieczne ciasteczko', async () => {
  const registration = {
    email: '  INTERNAL@example.invalid  ',
    displayName: ' Tester ',
    password,
    role: 'admin',
  };

  const response = await requestApi('/api/auth/register', { body: registration });
  const result = await response.json();
  primaryAccount = result.user;

  assert.equal(response.status, 201);
  assert.equal(primaryAccount.email, 'internal@example.invalid');
  assert.equal(primaryAccount.displayName, 'Tester');
  assert.equal(primaryAccount.role, 'user');
  assert.equal(primaryAccount.password_hash, undefined);

  const cookieHeader = response.headers.get('set-cookie');
  assert.match(cookieHeader, /HttpOnly/i);
  assert.match(cookieHeader, /SameSite=Lax/i);
  primaryCookie = cookieHeader.split(';')[0];

  // W bazie ma być skrót hasła, a nie jego jawna treść.
  const passwordResult = await environment.pool.query(
    'SELECT password_hash FROM users WHERE id = $1',
    [primaryAccount.id],
  );
  const storedPassword = passwordResult.rows[0].password_hash;
  assert.match(storedPassword, /^scrypt\$/);
  assert.ok(!storedPassword.includes(password));

  const sessionToken = primaryCookie.split('=')[1];
  const tokenHash = createHash('sha256').update(sessionToken).digest('hex');
  const sessionsResult = await environment.pool.query(
    'SELECT count(*)::int AS count FROM user_sessions WHERE token_hash = $1',
    [tokenHash],
  );
  assert.equal(sessionsResult.rows[0].count, 1);
});

test('AUT-03 | Ponowna rejestracja tego samego e-maila zwraca 409', async () => {
  const response = await requestApi('/api/auth/register', {
    body: {
      email: primaryAccount.email.toUpperCase(),
      displayName: 'Tester',
      password,
    },
  });

  assert.equal(response.status, 409);
  assert.equal(response.headers.get('set-cookie'), null);
});

test('AUT-04 | Sesja rozpoznaje użytkownika, a gość nie ma konta', async () => {
  const accountResponse = await requestApi('/api/auth/me', { cookie: primaryCookie });
  const guestResponse = await requestApi('/api/auth/me');
  const accountResult = await accountResponse.json();
  const guestResult = await guestResponse.json();

  assert.deepEqual(accountResult, { user: primaryAccount });
  assert.deepEqual(guestResult, { user: null });
});

test('AUT-05 | Błędne hasło i nieistniejące konto mają ten sam komunikat 401', async () => {
  const results = [];
  const emails = [primaryAccount.email, 'missing@example.invalid'];

  for (const email of emails) {
    const response = await requestApi('/api/auth/login', {
      body: { email, password: 'incorrect-password' },
    });

    assert.equal(response.status, 401);
    results.push(await response.json());
  }

  assert.deepEqual(results[0], results[1]);
});

test('AUT-06 | Logowanie i wylogowanie unieważniają sesję', async () => {
  const loginResponse = await requestApi('/api/auth/login', {
    body: { email: primaryAccount.email, password },
  });
  assert.equal(loginResponse.status, 200);
  const sessionCookie = loginResponse.headers.get('set-cookie').split(';')[0];

  const loggedInResponse = await requestApi('/api/auth/me', { cookie: sessionCookie });
  const loggedInResult = await loggedInResponse.json();
  assert.deepEqual(loggedInResult.user, primaryAccount);

  const logoutResponse = await requestApi('/api/auth/logout', {
    cookie: sessionCookie,
    method: 'POST',
  });
  assert.equal(logoutResponse.status, 204);

  const loggedOutResponse = await requestApi('/api/auth/me', { cookie: sessionCookie });
  const loggedOutResult = await loggedOutResponse.json();
  assert.deepEqual(loggedOutResult, { user: null });
});

test('AUT-07 | Wygasła sesja nie daje dostępu do postępów', async () => {
  const sessionToken = randomUUID();
  const tokenHash = createHash('sha256').update(sessionToken).digest('hex');

  await environment.pool.query(
    `INSERT INTO user_sessions(user_id, token_hash, expires_at)
     VALUES ($1, $2, now() - interval '1 minute')`,
    [primaryAccount.id, tokenHash],
  );
  const expiredCookie = `chronomap_session=${sessionToken}`;

  const progressResponse = await requestApi('/api/progress/', { cookie: expiredCookie });
  const accountResponse = await requestApi('/api/auth/me', { cookie: expiredCookie });
  const accountResult = await accountResponse.json();

  assert.equal(progressResponse.status, 401);
  assert.deepEqual(accountResult, { user: null });
});

test('AUT-08 | Uszkodzone kodowanie ciasteczka nie powoduje 500', async () => {
  const response = await requestApi('/api/auth/me', {
    cookie: 'chronomap_session=%E0%A4%A',
  });
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(result, { user: null });
});

test('AUT-09 | Żądania z niedozwolonego Origin są blokowane', async () => {
  const protectedPaths = ['/api/auth/register', '/api/auth/login', '/api/auth/logout'];

  for (const path of protectedPaths) {
    const response = await requestApi(path, {
      method: 'POST',
      body: {},
      headers: { Origin: 'https://untrusted.invalid' },
    });

    assert.equal(response.status, 403);
  }
});

// POSTĘPY W NAUCE
// Kolejne scenariusze zapisują próby tego samego konta i sprawdzają ich sumowanie.

test('PRG-01 | Gość nie odczytuje ani nie zapisuje postępów', async () => {
  const readResponse = await requestApi('/api/progress/');
  const saveResponse = await requestApi('/api/progress/attempts', { body: {} });

  assert.equal(readResponse.status, 401);
  assert.equal(saveResponse.status, 401);
});

test('PRG-02 | Nowe konto ma pusty panel i brak wyliczonej skuteczności', async () => {
  const progress = await readProgress();

  assert.deepEqual(progress.summary, {
    attempts: 0,
    completedLessons: 0,
    totalLessons: 7,
    accuracy: null,
    durationSeconds: 0,
  });
  assert.deepEqual(progress.recent, []);
  assert.ok(progress.lessons.every(item => (
    item.bestPercent === null && item.attempts === 0
  )));

  lessonAttempt = {
    id: randomUUID(),
    kind: 'lesson',
    slug: lesson.slug,
    accountId: primaryAccount.id,
    answers: correctAnswers,
    durationSeconds: 37,
  };
});

test('PRG-03 | Niekompletne, powtórzone i cudze odpowiedzi są odrzucane', async () => {
  const invalidAnswerSets = [
    correctAnswers.slice(1),
    correctAnswers.map(() => correctAnswers[0]),
    correctAnswers.map(answer => ({ ...answer, answerId: 'missing' })),
  ];

  for (const answers of invalidAnswerSets) {
    const response = await saveProgress({ ...lessonAttempt, answers });
    assert.equal(response.status, 400);
  }

  const progress = await readProgress();
  assert.equal(progress.summary.attempts, 0);
});

test('PRG-04 | Zapis odrzuca błędne ID, rodzaj, czas i nieznany quiz', async () => {
  const invalidChanges = [
    { id: 'invalid' },
    { kind: 'other' },
    { durationSeconds: -1 },
    { durationSeconds: 86401 },
    { durationSeconds: 1.5 },
  ];

  for (const change of invalidChanges) {
    const response = await saveProgress({ ...lessonAttempt, ...change });
    assert.equal(response.status, 400);
  }

  const missingLessonResponse = await saveProgress({ ...lessonAttempt, slug: 'missing' });
  assert.equal(missingLessonResponse.status, 404);
});

test('PRG-05 | Zmiana konta i niedozwolony Origin blokują zapis', async () => {
  const otherAccountResponse = await saveProgress(lessonAttempt, otherAccount.cookie);
  const blockedOriginResponse = await saveProgress(lessonAttempt, primaryCookie, {
    Origin: 'https://untrusted.invalid',
  });

  assert.equal(otherAccountResponse.status, 409);
  assert.equal(blockedOriginResponse.status, 403);
});

test('PRG-06 | Równoczesne powtórzenie próby zapisuje jeden wynik', async () => {
  // Promise.all wysyła oba zapisy równocześnie, celowo z tym samym ID próby.
  const responses = await Promise.all([
    saveProgress(lessonAttempt),
    saveProgress(lessonAttempt),
  ]);

  const statuses = responses.map(response => response.status).sort();
  assert.deepEqual(statuses, [200, 201]);

  for (const response of responses) {
    const result = await response.json();
    assert.deepEqual(result, { score: 3, total: 3 });
  }

  const progress = await readProgress();
  assert.equal(progress.summary.attempts, 1);
  assert.equal(progress.summary.completedLessons, 1);
  assert.equal(progress.summary.accuracy, 100);
  assert.equal(progress.summary.durationSeconds, 37);
});

test('PRG-07 | Serwer ignoruje podrobiony wynik, a panel liczy skuteczność i najlepszą próbę', async () => {
  const wrongAnswers = lesson.quiz.questions.map(question => {
    const wrongAnswer = question.answers.find(answer => (
      answer.id !== question.correctAnswerId
    ));
    return { questionId: question.id, answerId: wrongAnswer.id };
  });
  const wrongAttempt = {
    ...lessonAttempt,
    id: randomUUID(),
    score: 999,
    total: 999,
    answers: wrongAnswers,
  };

  const response = await saveProgress(wrongAttempt);
  const result = await response.json();

  assert.equal(response.status, 201);
  assert.deepEqual(result, { score: 0, total: 3 });

  const progress = await readProgress();
  assert.equal(progress.summary.accuracy, 50);
  assert.equal(progress.summary.completedLessons, 1);
  assert.equal(progress.lessons[0].bestPercent, 100);
  assert.equal(progress.lessons[0].attempts, 2);
});

test('PRG-08 | Konta mają oddzielne wyniki i nie przejmują istniejącej próby', async () => {
  const progressBefore = await readProgress(otherAccount.cookie);
  assert.equal(progressBefore.summary.attempts, 0);

  const stolenAttempt = { ...lessonAttempt, accountId: otherAccount.id };
  const response = await saveProgress(stolenAttempt, otherAccount.cookie);
  assert.equal(response.status, 409);

  const progressAfter = await readProgress(otherAccount.cookie);
  assert.equal(progressAfter.recent.length, 0);
});

test('PRG-09 | Quiz kategorii jest oceniany z bazy i nie zwiększa ukończonych lekcji', async () => {
  const answersResult = await environment.pool.query(
    `SELECT question.id, answer.id AS answer_id
     FROM quiz_questions question
     JOIN quiz_answers answer ON answer.question_id = question.id AND answer.is_correct
     JOIN quiz_categories category ON category.id = question.category_id
     WHERE category.slug = $1`,
    [categoryQuiz.category.slug],
  );
  const correctCategoryAnswers = answersResult.rows.map(question => ({
    questionId: question.id,
    answerId: question.answer_id,
  }));
  const categoryAttempt = {
    ...lessonAttempt,
    id: randomUUID(),
    kind: 'quiz',
    slug: categoryQuiz.category.slug,
    answers: correctCategoryAnswers,
  };

  const response = await saveProgress(categoryAttempt);
  const result = await response.json();
  const questionCount = correctCategoryAnswers.length;

  assert.equal(response.status, 201);
  assert.deepEqual(result, { score: questionCount, total: questionCount });

  const progress = await readProgress();
  const expectedAccuracy = Math.round(100 * (3 + questionCount) / (6 + questionCount));

  assert.equal(progress.summary.attempts, 3);
  assert.equal(progress.summary.completedLessons, 1);
  assert.equal(progress.summary.accuracy, expectedAccuracy);
});

test('PRG-10 | Historia pokazuje tylko dziesięć ostatnich wyników', async () => {
  for (let attemptNumber = 0; attemptNumber < 10; attemptNumber += 1) {
    const response = await saveProgress({
      ...lessonAttempt,
      id: randomUUID(),
      durationSeconds: attemptNumber,
    });
    assert.equal(response.status, 201);
  }

  const progress = await readProgress();
  assert.equal(progress.summary.attempts, 13);
  assert.equal(progress.recent.length, 10);
  assert.ok(progress.recent.every(attempt => attempt.kind === 'lesson'));
});

test('PRG-11 | Ponowiony zapis nie zmienia pierwotnego wyniku i czasu', async () => {
  const response = await saveProgress({ ...lessonAttempt, durationSeconds: 999 });
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(result, { score: 3, total: 3 });

  const durationResult = await environment.pool.query(
    'SELECT duration_seconds FROM learning_attempts WHERE id = $1',
    [lessonAttempt.id],
  );
  const progress = await readProgress();

  assert.equal(durationResult.rows[0].duration_seconds, 37);
  assert.equal(progress.summary.attempts, 13);
});

// ODTWARZANIE DANYCH I OGRANICZENIA BAZY

test('DB-01 | Eksport odtworzonych danych zachowuje 333 wydarzenia i dostępne źródła', async () => {
  const restoredSnapshot = await readSnapshot(environment.admin);
  const snapshotFile = await readFile(
    new URL('../../database/events.snapshot.json', import.meta.url),
    'utf8',
  );
  const originalSnapshot = JSON.parse(snapshotFile);

  assert.equal(restoredSnapshot.events.length, 333);

  function comparableEvent({ event, category, sources }) {
    return {
      title: event.title,
      date: event.event_date,
      description: event.description,
      country: event.country,
      place: event.place,
      longitude: event.longitude,
      latitude: event.latitude,
      category: category?.name,
      sources: sources.map(source => ({ title: source.title, url: source.url })),
    };
  }

  function orderedEvents(snapshot) {
    return snapshot.events.map(comparableEvent).sort((first, second) => (
      `${first.date}|${first.title}`.localeCompare(`${second.date}|${second.title}`)
    ));
  }

  assert.deepEqual(orderedEvents(restoredSnapshot), orderedEvents(originalSnapshot));
  assert.ok(restoredSnapshot.events.every(item => (
    !Object.hasOwn(item.event, 'id') && !Object.hasOwn(item.event, 'created_by')
  )));
});

test('DB-02 | Odtwarzanie odmawia zapisu w niepustej bazie', async () => {
  const snapshot = await readSnapshot(environment.admin);

  await environment.admin.query('BEGIN');
  try {
    await assert.rejects(
      restoreSnapshot(environment.admin, snapshot),
      /Baza zawiera wydarzenia/,
    );
  } finally {
    // Cofamy transakcję także wtedy, gdy sprawdzenie zakończy się błędem.
    await environment.admin.query('ROLLBACK');
  }

  const snapshotAfter = await readSnapshot(environment.admin);
  assert.deepEqual(snapshotAfter, snapshot);
});

test('DB-03 | Ograniczenia bazy blokują niemożliwy wynik próby', async () => {
  const invalidAttemptQuery = environment.pool.query(
    `INSERT INTO learning_attempts
       (id, user_id, kind, slug, title, score, total, duration_seconds)
     VALUES ($1, $2, 'lesson', 'test', 'test', 4, 3, 0)`,
    [randomUUID(), primaryAccount.id],
  );

  await assert.rejects(invalidAttemptQuery, { code: '23514' });
});

// Limit rejestracji sprawdzamy na końcu, aby nie blokował wcześniejszych testów.
test('AUT-10 | Limit prób rejestracji zwraca 429', async () => {
  let response;

  for (let attemptNumber = 0; attemptNumber < 11; attemptNumber += 1) {
    response = await requestApi('/api/auth/register', { body: {} });

    if (response.status === 429) {
      break;
    }

    assert.equal(response.status, 400);
  }

  assert.equal(response.status, 429);
});
