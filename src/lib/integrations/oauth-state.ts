/**
 * OAuth `state` parameter — protects against CSRF.
 *
 * Without `state`, an attacker could trick your authenticated browser
 * into completing OAuth with credentials they control (binding their
 * Spotify account to your admin session). Validating `state` at the
 * callback ensures the redirect originated from a flow we started.
 *
 * Implementation: a short-lived JWT signed with AUTH_SECRET, containing
 * the provider name and a timestamp. Stateless — we don't need to store
 * the state server-side.
 */

import "server-only";
import { SignJWT, jwtVerify } from "jose";

const STATE_TTL_SECONDS = 10 * 60; // 10 minutes — generous for the OAuth round-trip

interface StatePayload {
  provider: string;
}

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function signOauthState(provider: string): Promise<string> {
  return new SignJWT({ provider })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${STATE_TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function verifyOauthState(
  state: string | null | undefined,
  expectedProvider: string,
): Promise<StatePayload | null> {
  if (!state) return null;
  try {
    const { payload } = await jwtVerify(state, getSecret(), {
      algorithms: ["HS256"],
    });
    if (payload.provider !== expectedProvider) return null;
    return { provider: expectedProvider };
  } catch {
    return null;
  }
}
