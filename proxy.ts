import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  PENDING_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  signSession,
  verifyPendingSession,
  verifySession,
} from "@/lib/auth/session";
import { getSafeAdminRedirect } from "@/lib/auth/redirects";

/**
 * Edge proxy (Next 16 renamed middleware -> proxy).
 *
 * Auth state matrix:
 *   - Full session  → all /admin/* allowed; /admin/login redirects to /admin
 *   - Pending only  → ONLY /admin/login/2fa allowed; everything else redirects there
 *   - Neither       → /admin/login allowed; everything else redirects to login
 *
 * The verify endpoint at /api/auth/2fa/verify is NOT matched by this proxy
 * (it's outside /admin/*); it reads the pending cookie itself.
 */

const LOGIN_PATH = "/admin/login";
const TWO_FA_PATH = "/admin/login/2fa";

function isProtectedAdminPath(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const pendingToken = request.cookies.get(PENDING_COOKIE_NAME)?.value;

  const session = await verifySession(sessionToken);
  // No need to verify pending if a full session exists — full session wins.
  const pending = !session ? await verifyPendingSession(pendingToken) : null;

  // 1. /admin/login/2fa — only valid for pending sessions
  if (pathname === TWO_FA_PATH) {
    if (session) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    if (!pending) {
      return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
    }
    return NextResponse.next();
  }

  // 2. /admin/login — only show form when not authenticated
  if (pathname === LOGIN_PATH) {
    if (session) {
      const redirectUrl = new URL("/admin", request.url);
      const response = NextResponse.redirect(redirectUrl);
      const refreshedToken = await signSession({ userId: session.userId });
      response.cookies.set(
        SESSION_COOKIE_NAME,
        refreshedToken,
        SESSION_COOKIE_OPTIONS,
      );
      return response;
    }
    if (pending) {
      // Mid-flow — push them to the 2fa step instead of restarting.
      return NextResponse.redirect(new URL(TWO_FA_PATH, request.url));
    }
    return NextResponse.next();
  }

  // 3. Everything else under /admin/* — must be fully authenticated
  if (!isProtectedAdminPath(pathname)) {
    return NextResponse.next();
  }

  if (!session) {
    if (pending) {
      // Partial auth — finish 2FA before doing anything else.
      return NextResponse.redirect(new URL(TWO_FA_PATH, request.url));
    }
    const loginUrl = new URL(LOGIN_PATH, request.url);
    const next = getSafeAdminRedirect(`${pathname}${search}`);
    loginUrl.searchParams.set("next", next);
    return NextResponse.redirect(loginUrl);
  }

  // Fully authenticated — sliding refresh, then proceed.
  const response = NextResponse.next();
  const refreshedToken = await signSession({ userId: session.userId });
  response.cookies.set(
    SESSION_COOKIE_NAME,
    refreshedToken,
    SESSION_COOKIE_OPTIONS,
  );
  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
