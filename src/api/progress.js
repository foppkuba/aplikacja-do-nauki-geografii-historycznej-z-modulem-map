async function request(path, options = {}) {
  const response = await fetch(`/api/progress${path}`, { credentials: 'same-origin', ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Nie udało się pobrać lub zapisać postępów.');
  return data;
}

export const fetchProgress = (signal) => request('/', { signal });
export const saveAttempt = (attempt) => request('/attempts', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(attempt),
});
