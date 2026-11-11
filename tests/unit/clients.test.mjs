import assert from 'node:assert/strict';
import test from 'node:test';
import {
  fetchEvents, fetchCountries, fetchWarAlignments, fetchWarTerritorialKeyframes,
} from '../../src/api/events.js';
import { fetchQuizCategories, fetchQuiz, checkQuizAnswer } from '../../src/api/quizzes.js';
import { fetchCurrentUser, registerUser, loginUser, logoutUser } from '../../src/api/auth.js';
import { fetchProgress, saveAttempt } from '../../src/api/progress.js';

// Sprawdzamy kod wysyłający żądania, bez uruchamiania serwera.
// testContext.mock.method zastępuje fetch przygotowaną odpowiedzią
// i automatycznie przywraca oryginalną funkcję po zakończeniu testu.
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

test('HTTP-01 | Klient mapy odczytuje dane i przekazuje anulowanie żądania', async testContext => {
  const signal = new AbortController().signal;

  testContext.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/events');
    assert.equal(options.signal, signal);
    return jsonResponse({ events: [{ id: 1 }] });
  });

  const events = await fetchEvents({ signal });
  assert.deepEqual(events, [{ id: 1 }]);
});

test('HTTP-02 | Klient mapy zgłasza błąd HTTP i nieprawidłowy format danych', async testContext => {
  const requestFunctions = [
    fetchEvents,
    () => fetchCountries(1939),
    () => fetchWarAlignments('ww1', '1914-07'),
    () => fetchWarTerritorialKeyframes('ww1'),
  ];

  for (const sendRequest of requestFunctions) {
    testContext.mock.method(globalThis, 'fetch', async () => jsonResponse({}, 503));
    await assert.rejects(sendRequest(), /503/);

    testContext.mock.method(globalThis, 'fetch', async () => jsonResponse({}));
    await assert.rejects(sendRequest(), /nieprawidłowe dane/);
  }
});

test('HTTP-03 | Klient quizów obsługuje listę kategorii i koduje identyfikator w URL', async testContext => {
  testContext.mock.method(globalThis, 'fetch', async () => (
    jsonResponse({ categories: [{ slug: 'test' }] })
  ));

  const categories = await fetchQuizCategories();
  assert.deepEqual(categories, [{ slug: 'test' }]);

  testContext.mock.method(globalThis, 'fetch', async url => {
    assert.equal(url, '/api/quizzes/a%2Fb%3F');
    return jsonResponse({ questions: [] });
  });

  const quiz = await fetchQuiz('a/b?');
  assert.deepEqual(quiz, { questions: [] });
});

test('HTTP-04 | Sprawdzanie odpowiedzi wysyła identyfikatory i zwraca błąd serwera', async testContext => {
  testContext.mock.method(globalThis, 'fetch', async (url, options) => {
    const sentBody = JSON.parse(options.body);

    assert.equal(url, '/api/quizzes/answer');
    assert.equal(options.method, 'POST');
    assert.deepEqual(sentBody, { questionId: 1, answerId: 2 });

    return jsonResponse({ error: 'Nie znaleziono odpowiedzi.' }, 404);
  });

  await assert.rejects(checkQuizAnswer(1, 2), /Nie znaleziono odpowiedzi/);
});

test('HTTP-05 | Konta używają sesji i prawidłowego formatu żądania', async testContext => {
  const user = { id: '7', email: 'test@example.invalid' };

  testContext.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(options.credentials, 'same-origin');

    if (url.endsWith('/logout')) {
      return new Response(null, { status: 204 });
    }

    if (options.body) {
      const sentBody = JSON.parse(options.body);
      assert.equal(options.headers['Content-Type'], 'application/json');
      assert.deepEqual(sentBody, { email: user.email });
    }

    return jsonResponse({ user });
  });

  const currentUser = await fetchCurrentUser();
  const registeredUser = await registerUser({ email: user.email });
  const loggedInUser = await loginUser({ email: user.email });
  const logoutResult = await logoutUser();

  assert.deepEqual(currentUser, user);
  assert.deepEqual(registeredUser, user);
  assert.deepEqual(loggedInUser, user);
  assert.equal(logoutResult, null);
});

test('HTTP-06 | Klienci kont i postępów zgłaszają komunikat przy niepoprawnym JSON błędu', async testContext => {
  testContext.mock.method(globalThis, 'fetch', async () => (
    new Response('unavailable', { status: 503 })
  ));

  await assert.rejects(fetchCurrentUser(), /Nie udało się wykonać operacji/);
  await assert.rejects(fetchProgress(), /Nie udało się pobrać lub zapisać postępów/);
  await assert.rejects(fetchQuiz('test'), /Nie udało się pobrać quizu/);
});

test('HTTP-07 | Zapis postępów zachowuje identyfikator próby przy ponowieniu', async testContext => {
  const attempt = {
    id: 'attempt-1',
    answers: [{ questionId: 'q1', answerId: 'a1' }],
  };

  testContext.mock.method(globalThis, 'fetch', async (url, options) => {
    const sentBody = JSON.parse(options.body);

    assert.equal(url, '/api/progress/attempts');
    assert.equal(options.credentials, 'same-origin');
    assert.deepEqual(sentBody, attempt);

    return jsonResponse({ score: 1, total: 1 });
  });

  const firstResult = await saveAttempt(attempt);
  const repeatedResult = await saveAttempt(attempt);

  assert.deepEqual(firstResult, { score: 1, total: 1 });
  assert.deepEqual(repeatedResult, { score: 1, total: 1 });
});

test('HTTP-08 | Anulowane żądanie zachowuje AbortError', async testContext => {
  const controller = new AbortController();
  controller.abort();

  testContext.mock.method(globalThis, 'fetch', async (_url, { signal }) => {
    signal.throwIfAborted();
  });

  await assert.rejects(
    fetchEvents({ signal: controller.signal }),
    { name: 'AbortError' },
  );
});
