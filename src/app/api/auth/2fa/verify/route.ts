import { NextRequest, NextResponse } from "next/server";
import { getUserById } from "@/lib/db/queries/users";
import { verifyTotpCode } from "@/lib/auth/totp";
import {
  PENDING_COOKIE_NAME,
  PENDING_COOKIE_OPTIONS,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  signSession,
  verifyPendingSession,
} from "@/lib/auth/session";
import { getSafeAdminRedirect } from "@/lib/auth/redirects";

/**
 * Second step of login when 2FA is enabled.
 *
 * Reads jt_2fa_pending → finds user → verifies TOTP code →
 * issues full session cookie + clears pending cookie → redirects to next.
 *
 * On failure, redirects back to /admin/login/2fa with an error param
 * (preserves the pending cookie so the user can retry).
 */
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const code = formData.get("code");
  const next = formData.get("next");
  const safeNext = getSafeAdminRedirect(
    typeof next === "string" ? next : undefined,
  );

  const buildRetry = (error: string) => {
    const url = new URL("/admin/login/2fa", request.url);
    url.searchParams.set("error", error);
    url.searchParams.set("next", safeNext);
    return NextResponse.redirect(url);
  };

  const buildLogin = () =>
    NextResponse.redirect(new URL("/admin/login", request.url));

  if (typeof code !== "string") {
    return buildRetry("invalid-request");
  }

  // Read the pending cookie. If it's missing or expired, send back to login.
  const pendingToken = request.cookies.get(PENDING_COOKIE_NAME)?.value;
  const pending = await verifyPendingSession(pendingToken);
  if (!pending) {
    return buildLogin();
  }

  const user = await getUserById(pending.userId);
  if (!user || !user.totpSecret) {
    // User was deleted, or 2FA was disabled mid-flow. Restart.
    return buildLogin();
  }

  if (!verifyTotpCode(code, user.totpSecret)) {
    return buildRetry("invalid-code");
  }

  // Success — swap pending for real session.
  const sessionToken = await signSession({ userId: user.id });
  const response = NextResponse.redirect(new URL(safeNext, request.url));
  response.cookies.set(
    SESSION_COOKIE_NAME,
    sessionToken,
    SESSION_COOKIE_OPTIONS,
  );
  response.cookies.set(PENDING_COOKIE_NAME, "", {
    ...PENDING_COOKIE_OPTIONS,
    maxAge: 0,
  });

  return response;
}
