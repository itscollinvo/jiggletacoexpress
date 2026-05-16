import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth/auth";
import { buildAuthorizeUrl } from "@/lib/integrations/spotify";
import { signOauthState } from "@/lib/integrations/oauth-state";

/**
 * Step 1 of the OAuth flow.
 * Auth-required: only the admin can initiate.
 *
 * Generates a CSRF state JWT, builds the Spotify authorize URL with it,
 * redirects the browser. The user lands on Spotify's consent screen.
 * After they approve, Spotify redirects them to /api/spotify/auth/callback.
 */
export async function POST() {
  await requireCurrentUser();

  const state = await signOauthState("spotify");
  const url = buildAuthorizeUrl(state);

  // 303 See Other — convert POST → GET so the browser GETs the Spotify
  // authorize URL (which only accepts GET).
  return NextResponse.redirect(url, 303);
}

// Also accept GET so the form can use either method. Browsers handle GET
// redirects more cleanly when the user clicks a link rather than submits a form.
export async function GET() {
  return POST();
}
