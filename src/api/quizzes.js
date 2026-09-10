const parseJson = async (response, fallbackMessage) => {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || fallbackMessage);
  return payload;
};

export async function fetchQuizCategories({ signal } = {}) {
  const response = await fetch("/api/quizzes/categories", { signal });
  const payload = await parseJson(response, "Nie udało się pobrać kategorii quizów.");
  if (!Array.isArray(payload.categories)) throw new Error("API quizów zwróciło nieprawidłowe dane.");
  return payload.categories;
}

export async function fetchQuiz(category, { signal } = {}) {
  const response = await fetch(`/api/quizzes/${encodeURIComponent(category)}`, { signal });
  return parseJson(response, "Nie udało się pobrać quizu.");
}

export async function checkQuizAnswer(questionId, answerId) {
  const response = await fetch("/api/quizzes/answer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questionId, answerId }),
  });
  return parseJson(response, "Nie udało się sprawdzić odpowiedzi.");
}
