import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth/auth";
import { exchangeCodeForTokens } from "@/lib/integrations/spotify";
import { verifyOauthState } from "@/lib/integrations/oauth-state";
import { upsertIntegrationToken } from "@/lib/db/queries/integration-tokens";

/**
 * Step 5 of the OAuth flow — Spotify redirects the user here with
 * `?code=...&state=...` (or `?error=...` if they denied).
 *
 * What we do:
 *   1. Verify auth (must still be the admin)
 *   2. Validate the state JWT — guards against CSRF
 *   3. Exchange the auth code for tokens via Spotify's /api/token
 *   4. Upsert the tokens into integration_tokens (provider="spotify")
 *   5. Redirect back to /admin/integrations with success/error indicator
 *
 * Auth requirement: even though Spotify is the one redirecting here, we
 * still want to guarantee the admin's session cookie is present —
 * otherwise an unauthenticated visitor with a leaked code could complete
 * the bind. requireCurrentUser() handles that.
 */
export async function GET(request: Request) {
  await requireCurrentUser();

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  const adminUrl = (status: string) => {
    const target = new URL("/admin/integrations", request.url);
    target.searchParams.set("spotify", status);
    return target;
  };

  if (errorParam) {
    // User denied or Spotify errored. errorParam is e.g. "access_denied".
    return NextResponse.redirect(adminUrl(`error-${errorParam}`));
  }

  if (!code || !state) {
    return NextResponse.redirect(adminUrl("error-missing-params"));
  }

  const stateOk = await verifyOauthState(state, "spotify");
  if (!stateOk) {
    return NextResponse.redirect(adminUrl("error-bad-state"));
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.refresh_token) {
      // Should always be present for code-grant on a fresh consent;
      // surface as an error so we don't store an unrefreshable token.
      return NextResponse.redirect(adminUrl("error-no-refresh"));
    }
    await upsertIntegrationToken({
      provider: "spotify",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      scope: tokens.scope,
    });
  } catch (err) {
    console.error("Spotify token exchange failed:", err);
    return NextResponse.redirect(adminUrl("error-exchange-failed"));
  }

  return NextResponse.redirect(adminUrl("connected"));
}
