/**
 * POST /api/vault/unlock
 *
 * Verifies the submitted access code against VAULT_ACCESS_CODE (env var).
 * On success: sets the vault session cookie and redirects to /vault/home.
 * On failure: redirects back to /vault with ?error=1.
 *
 * VAULT_ACCESS_CODE stores the plaintext code — no hashing needed here
 * because the threat model for env vars is different from DB storage.
 * If an attacker has your env vars, they have everything already. We use
 * timingSafeEqual instead of === to prevent timing side-channels.
 *
 * Why redirect instead of returning JSON?
 * The gate form is a plain HTML form (no JS fetch). Redirects are the
 * standard POST/Redirect/GET pattern — avoids resubmission on back-button.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";
import {
  VAULT_COOKIE_NAME,
  VAULT_COOKIE_OPTIONS,
  signVaultSession,
} from "@/lib/auth/vault-session";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const code = formData.get("code");

  if (typeof code !== "string" || !code.trim()) {
    return NextResponse.redirect(new URL("/vault?error=1", request.url), 303);
  }

  const storedCode = process.env.VAULT_ACCESS_CODE;
  if (!storedCode) {
    console.error("[vault/unlock] VAULT_ACCESS_CODE env var not set");
    return NextResponse.redirect(new URL("/vault?error=1", request.url), 303);
  }

  // timingSafeEqual prevents timing attacks — === can leak info about where
  // strings diverge based on how long the comparison takes.
  const submitted = Buffer.from(code.trim());
  const expected = Buffer.from(storedCode);
  const valid =
    submitted.length === expected.length &&
    timingSafeEqual(submitted, expected);

  if (!valid) {
    return NextResponse.redirect(new URL("/vault?error=1", request.url), 303);
  }

  const token = await signVaultSession();
  const response = NextResponse.redirect(
    new URL("/vault/home", request.url),
    303,
  );
  response.cookies.set(VAULT_COOKIE_NAME, token, VAULT_COOKIE_OPTIONS);
  return response;
}
