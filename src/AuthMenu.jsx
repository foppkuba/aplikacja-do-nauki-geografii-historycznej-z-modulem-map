import { useEffect, useState } from "react";
import { Eye, EyeOff, LogIn, LogOut, UserRound, X } from "lucide-react";
import { fetchCurrentUser, loginUser, logoutUser, registerUser } from "./api/auth";

export default function AuthMenu({ onUserChange }) {
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetchCurrentUser({ signal: controller.signal })
      .then((account) => { setUser(account); onUserChange(account); })
      .catch((requestError) => {
        if (requestError.name !== "AbortError") { console.error(requestError); onUserChange(null); }
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [onUserChange]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  const changeMode = (nextMode) => {
    setMode(nextMode);
    setError("");
  };

  const submit = async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSubmitting(true);
    setError("");
    const form = new FormData(formElement);
    try {
      const credentials = { email: form.get("email"), password: form.get("password") };
      const authenticatedUser = mode === "register"
        ? await registerUser({ ...credentials, displayName: form.get("displayName") })
        : await loginUser(credentials);
      formElement.reset();
      setUser(authenticatedUser);
      onUserChange(authenticatedUser);
      setOpen(false);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const logout = async () => {
    setSubmitting(true);
    setError("");
    try {
      await logoutUser();
      setUser(null);
      onUserChange(null);
      setOpen(false);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-menu">
      <button className="account-button" type="button" disabled={loading} onClick={() => setOpen(true)}>
        <UserRound size={17} />
        <span>{loading ? "Konto" : user?.displayName || "Zaloguj się"}</span>
      </button>

      {open && <div className="auth-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
        <section className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title">
          <button className="auth-close" type="button" aria-label="Zamknij" title="Zamknij" onClick={() => setOpen(false)}><X size={19} /></button>
          {user ? <div className="auth-profile">
            <span className="auth-avatar"><UserRound size={25} /></span>
            <small>ZALOGOWANO JAKO</small>
            <h2 id="auth-title">{user.displayName}</h2>
            <p>{user.email}</p>
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="auth-submit auth-logout" type="button" disabled={submitting} onClick={logout}>
              <LogOut size={17} /> {submitting ? "Wylogowywanie…" : "Wyloguj się"}
            </button>
          </div> : <>
            <small className="auth-kicker">TWOJE KONTO</small>
            <h2 id="auth-title">{mode === "login" ? "Witaj ponownie" : "Utwórz konto"}</h2>
            <div className="auth-tabs" role="tablist" aria-label="Rodzaj formularza">
              <button type="button" role="tab" aria-selected={mode === "login"} onClick={() => changeMode("login")}>Logowanie</button>
              <button type="button" role="tab" aria-selected={mode === "register"} onClick={() => changeMode("register")}>Rejestracja</button>
            </div>
            <form className="auth-form" onSubmit={submit}>
              {mode === "register" && <label>Nazwa użytkownika<input name="displayName" type="text" minLength="2" maxLength="80" autoComplete="name" required /></label>}
              <label>Adres e-mail<input name="email" type="email" maxLength="254" autoComplete="email" required /></label>
              <label>Hasło<span className="auth-password"><input name="password" type={showPassword ? "text" : "password"} minLength="12" maxLength="128" autoComplete={mode === "login" ? "current-password" : "new-password"} required /><button type="button" aria-label={showPassword ? "Ukryj hasło" : "Pokaż hasło"} title={showPassword ? "Ukryj hasło" : "Pokaż hasło"} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>
              {mode === "register" && <p className="auth-hint">Minimum 12 znaków.</p>}
              {error && <p className="auth-error" role="alert">{error}</p>}
              <button className="auth-submit" type="submit" disabled={submitting}>
                <LogIn size={17} /> {submitting ? "Proszę czekać…" : mode === "login" ? "Zaloguj się" : "Załóż konto"}
              </button>
            </form>
          </>}
        </section>
      </div>}
    </div>
  );
}
