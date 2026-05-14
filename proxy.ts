import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  signSession,
  verifySession,
} from "@/lib/auth/session";
import { getSafeAdminRedirect } from "@/lib/auth/redirects";

function isProtectedAdminPath(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySession(token);

  if (pathname === "/admin/login") {
    if (!session) {
      return NextResponse.next();
    }

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

  if (!isProtectedAdminPath(pathname)) {
    return NextResponse.next();
  }

  if (!session) {
    const loginUrl = new URL("/admin/login", request.url);
    const next = getSafeAdminRedirect(`${pathname}${search}`);
    loginUrl.searchParams.set("next", next);
    return NextResponse.redirect(loginUrl);
  }

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
