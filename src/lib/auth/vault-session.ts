/**
 * Vault session — entirely separate from the admin session.
 *
 * The vault uses a simple "you know the code" model rather than user accounts.
 * The payload is just { vault: true } — no userId, because there's no user,
 * just a shared secret access code.
 *
 * Kept in its own file (not merged with session.ts) for two reasons:
 *   1. The auth model is different — no userId, no 2FA flow.
 *   2. Isolation: a bug in vault auth can't accidentally leak admin access.
 *
 * TTL is 24 hours — long enough not to be annoying, short enough that
 * a device left open doesn't stay unlocked forever.
 */

import { SignJWT, jwtVerify } from "jose";

const VAULT_TTL_SECONDS = 60 * 60 * 24; // 24 hours

export const VAULT_COOKIE_NAME = "jt_vault";

export const VAULT_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: VAULT_TTL_SECONDS,
};

function getSecret(): Uint8Array {
  // Reuse AUTH_SECRET — it's the server's signing secret, not tied to a
  // specific user or session type. Using a separate secret would just be
  // another env var to manage with no real security benefit.
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export interface VaultPayload {
  vault: true;
}

export async function signVaultSession(): Promise<string> {
  return new SignJWT({ vault: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${VAULT_TTL_SECONDS}s`)
    .sign(getSecret());
}

/**
 * Returns { vault: true } if the token is valid, null otherwise.
 * Never throws — callers check for null.
 */
export async function verifyVaultSession(
  token: string | undefined,
): Promise<VaultPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
    });
    if (payload.vault !== true) return null;
    return { vault: true };
  } catch {
    return null;
  }
}
