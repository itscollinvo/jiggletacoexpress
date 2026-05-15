/**
 * Session token (JWT) utilities.
 *
 * We use the `jose` library because it works in BOTH the Node.js runtime
 * (API routes) AND the edge runtime (middleware). The classic `jsonwebtoken`
 * library is Node-only, which would break our middleware.
 *
 * Tokens are HS256-signed JWTs. Payload includes `sub` (subject = user id)
 * and `exp` (expiry timestamp). The signature uses AUTH_SECRET; anyone
 * can read the payload, but only our server can produce a valid signature.
 *
 * Lifetime: 1 hour. Short enough that a leaked token has limited usefulness;
 * long enough to not annoy you with frequent re-logins.
 */

import { SignJWT, jwtVerify } from "jose";

const SESSION_TTL_SECONDS = 60 * 60; // 1 hour

export interface SessionPayload {
  userId: number;
}

/** Returns the secret as a Uint8Array (jose's required format). */
function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

/** Sign a session JWT. Call this when a user successfully logs in. */
export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ userId: payload.userId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(payload.userId))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());
}

/**
 * Verify a session JWT. Returns the payload if valid, or null if the token
 * is missing, expired, or has a bad signature. NEVER throws — callers can
 * just check for null.
 */
export async function verifySession(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
    });
    if (typeof payload.userId !== "number") return null;
    return { userId: payload.userId };
  } catch {
    // Invalid token (bad signature, expired, malformed) — fail closed.
    return null;
  }
}

/** The cookie name we store the session token under. */
export const SESSION_COOKIE_NAME = "jt_session";

/** Cookie options used wherever we set the session cookie. */
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true, // not readable by JS — XSS can't steal the token
  secure: process.env.NODE_ENV === "production", // HTTPS only in prod
  sameSite: "strict" as const, // strongest CSRF protection for the admin-only session
  path: "/", // sent on all routes
  maxAge: SESSION_TTL_SECONDS,
};

/* ----------------------------------------------------------------------------
 * Pending-2FA session
 *
 * Issued after a successful password check IF the user has TOTP enabled.
 * Indicates "user authenticated step 1 of 2; awaiting code entry on
 * /admin/login/2fa". The proxy lets these visit ONLY /admin/login/2fa
 * (and the verify endpoint), nothing else.
 *
 * Short TTL (5 min) — if you don't enter your code in time, the cookie
 * expires and you start over from /admin/login.
 * ------------------------------------------------------------------------- */

export const PENDING_COOKIE_NAME = "jt_2fa_pending";
const PENDING_TTL_SECONDS = 5 * 60;

export const PENDING_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: PENDING_TTL_SECONDS,
};

export interface PendingPayload {
  userId: number;
  pending2fa: true;
}

export async function signPendingSession(
  payload: Omit<PendingPayload, "pending2fa">,
): Promise<string> {
  return new SignJWT({ userId: payload.userId, pending2fa: true })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(payload.userId))
    .setIssuedAt()
    .setExpirationTime(`${PENDING_TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function verifyPendingSession(
  token: string | undefined,
): Promise<PendingPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
    });
    if (typeof payload.userId !== "number" || payload.pending2fa !== true) {
      return null;
    }
    return { userId: payload.userId, pending2fa: true };
  } catch {
    return null;
  }
}
