// secureAuth.ts — authentication helpers for AURAE.
//
// Accounts live in localStorage. Passwords are never stored in plaintext:
// each account keeps a per-user salt and a PBKDF2-SHA256 hash. Legacy
// plaintext accounts created by older builds still log in and are upgraded
// to a hashed record on the next successful login.

const USERS_KEY = "aurae_users";
const REMEMBER_KEY = "aurae_remember";
const SESSION_KEY = "aurae_session";

const PBKDF2_ITERATIONS = 150_000;

export type StoredUser = {
  salt: string;
  hash: string;
  iterations: number;
  createdAt?: number;
};

export type LegacyUser = { password: string };

export type UserRecord = StoredUser | LegacyUser;

export function normalizeEmail(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

// local@domain.tld with a real TLD and no spaces or consecutive dots.
export function isEmailSyntaxValid(value: unknown): boolean {
  const email = normalizeEmail(value);
  if (email.includes("..")) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function safeParse(json: string | null): Record<string, unknown> {
  try {
    const parsed = json ? JSON.parse(json) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function loadUsers(): Record<string, UserRecord> {
  const raw = safeParse(localStorage.getItem(USERS_KEY));
  const out: Record<string, UserRecord> = {};
  for (const [email, data] of Object.entries(raw)) {
    const clean = normalizeEmail(email);
    if (clean && data) out[clean] = data as UserRecord;
  }
  return out;
}

export function saveUsers(users: Record<string, UserRecord>): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

// ── password hashing (Web Crypto PBKDF2) ──────────────────────────────

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < arr.length; i++) arr[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return arr;
}

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    keyMaterial,
    256,
  );
  return toHex(bits);
}

export async function hashPassword(password: string): Promise<StoredUser> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
  return { salt: toHex(salt.buffer), hash, iterations: PBKDF2_ITERATIONS, createdAt: Date.now() };
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function isLegacyRecord(record: UserRecord | undefined): record is LegacyUser {
  return Boolean(
    record &&
      typeof (record as LegacyUser).password === "string" &&
      (record as StoredUser).salt === undefined,
  );
}

export async function verifyPassword(password: string, record: UserRecord | undefined): Promise<boolean> {
  if (!record) return false;
  if (isLegacyRecord(record)) {
    return timingSafeEqual(password, record.password);
  }
  const hashed = record as StoredUser;
  if (typeof hashed.hash === "string" && typeof hashed.salt === "string") {
    const computed = await pbkdf2(password, fromHex(hashed.salt), hashed.iterations || PBKDF2_ITERATIONS);
    return timingSafeEqual(computed, hashed.hash);
  }
  return false;
}

// ── email domain verification (real address check) ────────────────────

async function fetchWithTimeout(url: string, opts: RequestInit, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

// "ok": domain can receive mail. "no-mx": resolves but accepts no mail.
// "unknown": DNS lookup unreachable, so we can't decide.
export type DomainCheck = "ok" | "no-mx" | "unknown";

export async function checkEmailDomain(email: string): Promise<DomainCheck> {
  const domain = normalizeEmail(email).split("@")[1];
  if (!domain || domain.includes("..")) return "no-mx";

  const lookup = async (type: "MX" | "A") => {
    const res = await fetchWithTimeout(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${type}`,
      { headers: { accept: "application/dns-json" } },
      6000,
    );
    if (!res.ok) throw new Error(`dns ${res.status}`);
    return res.json();
  };

  try {
    const mx = await lookup("MX");
    if (mx.Status === 0 && Array.isArray(mx.Answer) && mx.Answer.some((a: any) => a.type === 15)) {
      return "ok";
    }
    // RFC 5321 implicit MX: a domain with an A record can still accept mail.
    const a = await lookup("A");
    if (a.Status === 0 && Array.isArray(a.Answer) && a.Answer.some((rec: any) => rec.type === 1)) {
      return "ok";
    }
    return "no-mx";
  } catch {
    return "unknown";
  }
}

export type EmailVerification = { ok: boolean; email: string; error: string };

// Signup requires valid syntax and a domain that can receive mail. If the DNS
// lookup is unreachable we accept a syntactically valid address rather than
// locking the user out over a transient network problem.
export async function verifyEmailForSignup(email: string): Promise<EmailVerification> {
  const clean = normalizeEmail(email);
  if (!isEmailSyntaxValid(clean)) {
    return { ok: false, email: clean, error: "Enter a valid email address." };
  }
  const domain = await checkEmailDomain(clean);
  if (domain === "no-mx") {
    return { ok: false, email: clean, error: "This email domain can't receive mail. Use a real address." };
  }
  return { ok: true, email: clean, error: "" };
}

// ── session / remember-me ─────────────────────────────────────────────
//
// remember me  → email kept in localStorage, so the user stays signed in
//                across browser restarts.
// not checked  → email kept only in sessionStorage, so the session ends
//                when the tab/window closes.

export function persistSession(email: string, remember: boolean): void {
  const clean = normalizeEmail(email);
  sessionStorage.setItem(SESSION_KEY, clean);
  if (remember) localStorage.setItem(REMEMBER_KEY, clean);
  else localStorage.removeItem(REMEMBER_KEY);
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(REMEMBER_KEY);
}

export function getRememberedEmail(): string {
  return normalizeEmail(localStorage.getItem(REMEMBER_KEY));
}

export function getInitialUser(): string {
  const users = loadUsers();
  const active = getRememberedEmail() || normalizeEmail(sessionStorage.getItem(SESSION_KEY));
  if (active && users[active]) return active;
  clearSession();
  return "";
}
