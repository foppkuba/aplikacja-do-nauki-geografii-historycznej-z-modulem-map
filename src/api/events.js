export async function fetchEvents({ signal } = {}) {
  const response = await fetch("/api/events", { signal });
  if (!response.ok) throw new Error(`API wydarzeń zwróciło status ${response.status}.`);

  const payload = await response.json();
  if (!Array.isArray(payload.events)) throw new Error("API wydarzeń zwróciło nieprawidłowe dane.");
  return payload.events;
}

export async function fetchCountries(year, { signal } = {}) {
  const response = await fetch(`/api/countries?year=${encodeURIComponent(year)}`, { signal });
  if (!response.ok) throw new Error(`API państw zwróciło status ${response.status}.`);

  const payload = await response.json();
  if (!Array.isArray(payload.countries)) throw new Error("API państw zwróciło nieprawidłowe dane.");
  return payload.countries;
}

export async function fetchWarAlignments(war, month, { signal } = {}) {
  const params = new URLSearchParams({ war, month });
  const response = await fetch(`/api/war-alignments?${params}`, { signal });
  if (!response.ok) throw new Error(`API stron konfliktu zwróciło status ${response.status}.`);

  const payload = await response.json();
  if (!Array.isArray(payload.alignments)) throw new Error("API stron konfliktu zwróciło nieprawidłowe dane.");
  return payload.alignments;
}

export async function fetchWarTerritorialKeyframes(war, { signal } = {}) {
  const response = await fetch(`/api/war-territorial-keyframes?war=${encodeURIComponent(war)}`, { signal });
  if (!response.ok) throw new Error(`API zmian terytorialnych zwróciło status ${response.status}.`);
  const payload = await response.json();
  if (!Array.isArray(payload.keyframes)) throw new Error("API zmian terytorialnych zwróciło nieprawidłowe dane.");
  return payload.keyframes;
}
