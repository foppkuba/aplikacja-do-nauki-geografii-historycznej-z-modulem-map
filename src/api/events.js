export async function fetchEvents({ signal } = {}) {
  const response = await fetch("/api/events", { signal });
  if (!response.ok) throw new Error(`API wydarzeń zwróciło status ${response.status}.`);

  const payload = await response.json();
  if (!Array.isArray(payload.events)) throw new Error("API wydarzeń zwróciło nieprawidłowe dane.");
  return payload.events;
}
