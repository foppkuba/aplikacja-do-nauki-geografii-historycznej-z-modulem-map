import { Router } from "express";
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { pool } from "./db.js";

const router = Router();
const scrypt = promisify(scryptCallback);
const COOKIE_NAME = "chronomap_session";
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const SCRYPT_OPTIONS = { N: 2 ** 17, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
const attempts = new Map();

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function publicUser(user) {
  return { id: user.id, email: user.email, displayName: user.display_name, role: user.role };
}

function parseCookies(header = "") {
  return Object.fromEntries(header.split(";").map((part) => part.trim()).filter(Boolean).map((part) => {
    const separator = part.indexOf("=");
    return separator < 0 ? [part, ""] : [part.slice(0, separator), decodeURIComponent(part.slice(separator + 1))];
  }));
}

function tokenHash(token) {
  return createHash("sha256").update(token).digest("hex");
}

async function hashPassword(password) {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, 64, SCRYPT_OPTIONS);
  return `scrypt$${SCRYPT_OPTIONS.N}$${SCRYPT_OPTIONS.r}$${SCRYPT_OPTIONS.p}$${salt.toString("base64")}$${derived.toString("base64")}`;
}

async function verifyPassword(password, encoded) {
  const [algorithm, n, r, p, saltValue, hashValue] = String(encoded).split("$");
  if (algorithm !== "scrypt" || !saltValue || !hashValue) return false;
  const expected = Buffer.from(hashValue, "base64");
  const actual = await scrypt(password, Buffer.from(saltValue, "base64"), expected.length, {
    N: Number(n), r: Number(r), p: Number(p), maxmem: 256 * 1024 * 1024,
  });
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_MS,
  };
}

function clientIp(request) {
  return request.ip?.replace(/^::ffff:/, "") || null;
}

function verifyOrigin(request, response, next) {
  const origin = request.get("origin");
  if (!origin) return next();
  const configured = (process.env.APP_ORIGINS || "").split(",").map((value) => value.trim()).filter(Boolean);
  const allowed = new Set([
    `${request.protocol}://${request.get("host")}`,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    ...configured,
  ]);
  if (!allowed.has(origin)) return response.status(403).json({ error: "Niedozwolone źródło żądania." });
  return next();
}

function rateLimit(request, response, next) {
  const key = `${clientIp(request)}:${request.path}`;
  const now = Date.now();
  const recent = (attempts.get(key) || []).filter((time) => now - time < 15 * 60 * 1000);
  if (recent.length >= 10) return response.status(429).json({ error: "Zbyt wiele prób. Spróbuj ponownie za kilka minut." });
  recent.push(now);
  attempts.set(key, recent);
  return next();
}

async function createSession(userId, request, response) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS);
  await pool.query(`
    INSERT INTO user_sessions (user_id, token_hash, expires_at, user_agent, ip_address)
    VALUES ($1, $2, $3, $4, $5)
  `, [userId, tokenHash(token), expiresAt, request.get("user-agent")?.slice(0, 500) || null, clientIp(request)]);
  response.cookie(COOKIE_NAME, token, cookieOptions());
}

async function currentUser(request) {
  const token = parseCookies(request.get("cookie"))[COOKIE_NAME];
  if (!token) return null;
  const result = await pool.query(`
    SELECT account.id, account.email, account.display_name, account.role
    FROM user_sessions session
    JOIN users account ON account.id = session.user_id
    WHERE session.token_hash = $1 AND session.expires_at > now()
  `, [tokenHash(token)]);
  return result.rows[0] || null;
}

router.post("/register", verifyOrigin, rateLimit, async (request, response, next) => {
  try {
    const email = normalizeEmail(request.body?.email);
    const displayName = typeof request.body?.displayName === "string" ? request.body.displayName.trim() : "";
    const password = typeof request.body?.password === "string" ? request.body.password : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return response.status(400).json({ error: "Podaj prawidłowy adres e-mail." });
    }
    if (displayName.length < 2 || displayName.length > 80) {
      return response.status(400).json({ error: "Nazwa użytkownika musi mieć od 2 do 80 znaków." });
    }
    if (password.length < 12 || password.length > 128) {
      return response.status(400).json({ error: "Hasło musi mieć od 12 do 128 znaków." });
    }

    const passwordHash = await hashPassword(password);
    const result = await pool.query(`
      INSERT INTO users (email, display_name, password_hash)
      VALUES ($1, $2, $3)
      ON CONFLICT DO NOTHING
      RETURNING id, email, display_name, role
    `, [email, displayName, passwordHash]);
    if (!result.rowCount) return response.status(409).json({ error: "Konto z tym adresem e-mail już istnieje." });
    await createSession(result.rows[0].id, request, response);
    return response.status(201).json({ user: publicUser(result.rows[0]) });
  } catch (error) {
    return next(error);
  }
});

router.post("/login", verifyOrigin, rateLimit, async (request, response, next) => {
  try {
    const email = normalizeEmail(request.body?.email);
    const password = typeof request.body?.password === "string" ? request.body.password : "";
    const result = await pool.query("SELECT id, email, display_name, role, password_hash FROM users WHERE email = $1", [email]);
    const fallbackHash = "scrypt$131072$8$1$MDEyMzQ1Njc4OWFiY2RlZg==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==";
    const valid = await verifyPassword(password, result.rows[0]?.password_hash || fallbackHash);
    if (!result.rowCount || !valid) {
      return response.status(401).json({ error: "Nieprawidłowy adres e-mail lub hasło." });
    }
    await createSession(result.rows[0].id, request, response);
    return response.json({ user: publicUser(result.rows[0]) });
  } catch (error) {
    return next(error);
  }
});

router.get("/me", async (request, response, next) => {
  try {
    const user = await currentUser(request);
    return response.json({ user: user ? publicUser(user) : null });
  } catch (error) {
    return next(error);
  }
});

router.post("/logout", verifyOrigin, async (request, response, next) => {
  try {
    const token = parseCookies(request.get("cookie"))[COOKIE_NAME];
    if (token) await pool.query("DELETE FROM user_sessions WHERE token_hash = $1", [tokenHash(token)]);
    response.clearCookie(COOKIE_NAME, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" });
    return response.status(204).end();
  } catch (error) {
    return next(error);
  }
});

export { router as authRouter };
