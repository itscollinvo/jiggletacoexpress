/**
 * Spotify OAuth + Web API helpers.
 *
 * Two endpoints we hit:
 *   - https://accounts.spotify.com/authorize  — user-facing consent screen
 *   - https://accounts.spotify.com/api/token  — server-to-server token exchange
 *
 * Authorization is HTTP Basic with `client_id:client_secret` base64-encoded.
 * That goes in the Authorization header; the body is form-urlencoded.
 *
 * We use Node's built-in `fetch` (Next 16 / Node 20+) — no extra HTTP client
 * needed.
 */

import "server-only";

export const SPOTIFY_AUTHORIZE_URL = "https://accounts.spotify.com/authorize";
export const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";

/** Scopes we request — enough for the now-playing widget. */
export const SPOTIFY_SCOPES = [
  "user-read-currently-playing",
  "user-read-playback-state",
].join(" ");

interface SpotifyConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

function getConfig(): SpotifyConfig {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Spotify env vars not set: need SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REDIRECT_URI",
    );
  }
  return { clientId, clientSecret, redirectUri };
}

function buildBasicAuthHeader(): string {
  const { clientId, clientSecret } = getConfig();
  // Node's `Buffer` works in serverful API routes. For edge-runtime compat
  // we'd switch to `btoa` — not needed here since these routes run in Node.
  const encoded = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  return `Basic ${encoded}`;
}

/** Build the URL to redirect the user to for consent (step 2 of OAuth flow). */
export function buildAuthorizeUrl(state: string): string {
  const { clientId, redirectUri } = getConfig();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: SPOTIFY_SCOPES,
    redirect_uri: redirectUri,
    state,
    // `show_dialog=true` forces the consent screen even if the user already
    // approved. Set to "false" once we trust our flow; useful for testing.
    show_dialog: "true",
  });
  return `${SPOTIFY_AUTHORIZE_URL}?${params.toString()}`;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number; // seconds
  scope: string;
  token_type: string;
}

/** Exchange the authorization code (from the callback) for tokens. */
export async function exchangeCodeForTokens(
  code: string,
): Promise<TokenResponse> {
  const { redirectUri } = getConfig();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });
  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: buildBasicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Spotify token exchange failed: ${res.status} ${errText}`);
  }
  return (await res.json()) as TokenResponse;
}

/** Use a refresh token to mint a new access token. */
export async function refreshAccessToken(
  refreshToken: string,
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: buildBasicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Spotify refresh failed: ${res.status} ${errText}`);
  }
  // Note: Spotify may or may not return a new refresh_token. If absent,
  // the OLD refresh token stays valid — callers should preserve it.
  return (await res.json()) as TokenResponse;
}
