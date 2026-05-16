import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/db/queries/users";
import { verifyPassword } from "@/lib/auth/password";
import {
  PENDING_COOKIE_NAME,
  PENDING_COOKIE_OPTIONS,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  signPendingSession,
  signSession,
} from "@/lib/auth/session";
import { getSafeAdminRedirect } from "@/lib/auth/redirects";
import { getClientIp, loginRateLimit } from "@/lib/rate-limit";

/**
 * NOTE on redirect status codes:
 *   - HTTP 307 = preserve method (POST → POST). Default for NextResponse.redirect().
 *   - HTTP 303 = "See Other" — convert to GET on the next request.
 *
 * For Post/Redirect/Get (the standard pattern after a form submission), we
 * want 303. Otherwise the browser re-POSTs the form data to the redirect
 * target, which interacts badly with cookie propagation in some browsers
 * and is semantically wrong (re-submitting a login form on every redirect).
 */
const SEE_OTHER = 303;

function buildLoginRedirect(request: NextRequest, params?: URLSearchParams) {
  const url = new URL("/admin/login", request.url);
  if (params) {
    url.search = params.toString();
  }
  return url;
}

export async function POST(request: NextRequest) {
  // Rate-limit BEFORE parsing form data so a flood of garbage POSTs costs
  // us only one Redis check per request. Counts every attempt — including
  // successful ones — against the IP. For a single-admin personal site
  // that's fine; you'd never legitimately log in 5+ times in 15 minutes.
  const ip = getClientIp(request.headers);
  const rate = await loginRateLimit.limit(ip);
  if (!rate.success) {
    return NextResponse.redirect(
      buildLoginRedirect(
        request,
        new URLSearchParams({ error: "rate-limited" }),
      ),
      SEE_OTHER,
    );
  }

  const formData = await request.formData();
  const email = formData.get("email");
  const password = formData.get("password");
  const next = formData.get("next");

  const safeNext = getSafeAdminRedirect(
    typeof next === "string" ? next : undefined,
  );

  if (typeof email !== "string" || typeof password !== "string") {
    const redirectUrl = buildLoginRedirect(
      request,
      new URLSearchParams({
        error: "invalid-request",
        next: safeNext,
      }),
    );
    return NextResponse.redirect(redirectUrl, SEE_OTHER);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await getUserByEmail(normalizedEmail);

  if (!user) {
    const redirectUrl = buildLoginRedirect(
      request,
      new URLSearchParams({
        error: "invalid-credentials",
        next: safeNext,
      }),
    );
    return NextResponse.redirect(redirectUrl, SEE_OTHER);
  }

  const passwordValid = await verifyPassword(password, user.passwordHash);

  if (!passwordValid) {
    const redirectUrl = buildLoginRedirect(
      request,
      new URLSearchParams({
        error: "invalid-credentials",
        next: safeNext,
      }),
    );
    return NextResponse.redirect(redirectUrl, SEE_OTHER);
  }

  // 2FA branch: if the user has TOTP enabled, don't issue a full session yet.
  // Instead, issue a short-lived "pending 2FA" cookie and redirect to the
  // second-step page. The proxy enforces that only /admin/login/2fa is
  // reachable while only the pending cookie is present.
  if (user.totpSecret) {
    const pendingToken = await signPendingSession({ userId: user.id });
    const twoFaUrl = new URL("/admin/login/2fa", request.url);
    twoFaUrl.searchParams.set("next", safeNext);
    const response = NextResponse.redirect(twoFaUrl, SEE_OTHER);
    response.cookies.set(
      PENDING_COOKIE_NAME,
      pendingToken,
      PENDING_COOKIE_OPTIONS,
    );
    return response;
  }

  const token = await signSession({ userId: user.id });
  const redirectUrl = new URL(safeNext, request.url);
  const response = NextResponse.redirect(redirectUrl, SEE_OTHER);

  response.cookies.set(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);

  return response;
}
