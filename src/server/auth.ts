import "server-only";

import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { queryOne } from "./db";

/*
  Authentication for a single-user app.

  The old lock screen hashed the password with SHA-256 in the browser and
  compared it to a hash sitting in the same localStorage — a privacy screen,
  never a control, and its own source file said so. Once the data lives in
  Postgres that is no longer survivable: the browser is not the thing being
  convinced any more, the server is, and anything the browser can compute an
  attacker can compute too.

  So: scrypt with a per-install random salt (deliberately slow, unlike SHA-256,
  which is built to be fast and therefore cheap to brute-force), verified on
  the server, and an HMAC-signed httpOnly cookie as the session. No third-party
  auth service — there is one account, and it never needs recovery flows,
  social login, or a users table.
*/

const scrypt = promisify(scryptCb) as (p: string | Buffer, s: string | Buffer, k: number) => Promise<Buffer>;

const KEY_LENGTH = 64;
export const SESSION_COOKIE = "yawm_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export interface Credential {
  password_hash: string;
  salt: string;
  session_secret: string;
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const derived = await scrypt(password, salt, KEY_LENGTH);
  return derived.toString("hex");
}

export function newSalt(): string {
  return randomBytes(16).toString("hex");
}

export function newSessionSecret(): string {
  return randomBytes(32).toString("hex");
}

/** Constant-time compare, so a wrong password can't be found a byte at a time. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function verifyPassword(password: string, credential: Credential): Promise<boolean> {
  const attempt = await hashPassword(password, credential.salt);
  return safeEqual(attempt, credential.password_hash);
}

export async function readCredential(): Promise<Credential | null> {
  return queryOne<Credential>("SELECT password_hash, salt, session_secret FROM credential WHERE id = 1");
}

/*
  The token carries its own expiry and is signed with a secret held in the
  database. Rotating that secret invalidates every cookie ever issued, which is
  what a password change has to do — otherwise a session stolen before the
  change would outlive it.
*/
function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function issueToken(secret: string): string {
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const payload = String(expiresAt);
  return `${payload}.${sign(payload, secret)}`;
}

export function tokenIsValid(token: string, secret: string): boolean {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  if (!safeEqual(signature, sign(payload, secret))) return false;
  const expiresAt = Number(payload);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

export async function setSessionCookie(secret: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, issueToken(secret), {
    httpOnly: true, // never readable from JavaScript, so XSS can't lift it
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** True when the request carries a valid, unexpired session for this install. */
export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  const credential = await readCredential();
  if (!credential) return false;
  return tokenIsValid(token, credential.session_secret);
}
