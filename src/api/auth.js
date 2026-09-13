async function request(path, options = {}) {
  const response = await fetch(`/api/auth${path}`, {
    credentials: "same-origin",
    ...options,
    headers: options.body ? { "Content-Type": "application/json", ...options.headers } : options.headers,
  });
  if (response.status === 204) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Nie udało się wykonać operacji.");
  return payload;
}

export async function fetchCurrentUser({ signal } = {}) {
  const payload = await request("/me", { signal });
  return payload.user;
}

export async function registerUser(data) {
  const payload = await request("/register", { method: "POST", body: JSON.stringify(data) });
  return payload.user;
}

export async function loginUser(data) {
  const payload = await request("/login", { method: "POST", body: JSON.stringify(data) });
  return payload.user;
}

export function logoutUser() {
  return request("/logout", { method: "POST" });
}
