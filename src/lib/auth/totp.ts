/**
 * TOTP (RFC 6238) utilities.
 *
 * The flow:
 *   1. `generateTotpSecret()` — random 20-byte secret, base32-encoded.
 *      Stored in user.totpSecret in the DB once the user verifies setup.
 *   2. `buildOtpauthUrl()` — builds the standard otpauth:// URI that
 *      authenticator apps parse from QR codes.
 *   3. `generateQrDataUrl()` — turns the otpauth URL into a data: URL
 *      we can drop into an <img src="..."> tag.
 *   4. `verifyTotpCode()` — checks a 6-digit code against a stored secret.
 *      Tolerates ±1 time window (i.e., accepts the previous and next
 *      30-second codes too) to handle clock drift between server and phone.
 *
 * Setup-pending JWT:
 *   When the user clicks "Enable 2FA", the server generates a secret BUT
 *   doesn't store it yet — first we want the user to scan the QR and
 *   confirm by entering a code. We pass the unconfirmed secret around
 *   inside a short-lived signed JWT (5 min). Stateless.
 */

import { authenticator } from "otplib";
import qrcode from "qrcode";
import { SignJWT, jwtVerify } from "jose";

const ISSUER = "jiggletaco";
// Allow ±1 step (so codes from 30s ago and 30s in the future are valid).
// Default is 0 (only the current step). 1 is the typical "user-friendly" value.
authenticator.options = { window: 1 };

export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

export function buildOtpauthUrl(email: string, secret: string): string {
  return authenticator.keyuri(email, ISSUER, secret);
}

export async function generateQrDataUrl(otpauthUrl: string): Promise<string> {
  return qrcode.toDataURL(otpauthUrl, { width: 240, margin: 1 });
}

export function verifyTotpCode(code: string, secret: string): boolean {
  // Strip any spaces a user might type (e.g. "123 456").
  const cleaned = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(cleaned)) return false;
  try {
    return authenticator.verify({ token: cleaned, secret });
  } catch {
    return false;
  }
}

/* ----------------------------------------------------------------------------
 * Setup-pending JWT — short-lived token holding an unconfirmed TOTP secret.
 * Signed with the same AUTH_SECRET so we don't need a second secret to manage.
 * ------------------------------------------------------------------------- */

const SETUP_TTL_SECONDS = 5 * 60; // 5 minutes

interface SetupPayload {
  userId: number;
  secret: string;
}

function getAuthSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function signSetupToken(payload: SetupPayload): Promise<string> {
  return new SignJWT({ userId: payload.userId, totpSecret: payload.secret })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(payload.userId))
    .setIssuedAt()
    .setExpirationTime(`${SETUP_TTL_SECONDS}s`)
    .sign(getAuthSecret());
}

export async function verifySetupToken(
  token: string | undefined,
): Promise<SetupPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getAuthSecret(), {
      algorithms: ["HS256"],
    });
    if (
      typeof payload.userId !== "number" ||
      typeof payload.totpSecret !== "string"
    ) {
      return null;
    }
    return { userId: payload.userId, secret: payload.totpSecret };
  } catch {
    return null;
  }
}
