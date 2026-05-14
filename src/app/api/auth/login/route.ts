import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/db/queries/users";
import { verifyPassword } from "@/lib/auth/password";
import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  signSession,
} from "@/lib/auth/session";
import { getSafeAdminRedirect } from "@/lib/auth/redirects";

function buildLoginRedirect(request: NextRequest, params?: URLSearchParams) {
  const url = new URL("/admin/login", request.url);
  if (params) {
    url.search = params.toString();
  }
  return url;
}

export async function POST(request: NextRequest) {
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
    return NextResponse.redirect(redirectUrl);
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
    return NextResponse.redirect(redirectUrl);
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
    return NextResponse.redirect(redirectUrl);
  }

  const token = await signSession({ userId: user.id });
  const redirectUrl = new URL(safeNext, request.url);
  const response = NextResponse.redirect(redirectUrl);

  response.cookies.set(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);

  return response;
}
