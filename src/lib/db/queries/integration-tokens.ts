/**
 * CRUD helpers for the `integration_tokens` table.
 *
 * "Provider" is the short key like "spotify" — it's the primary lookup
 * because we only have one active token row per provider at a time.
 */

import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "../index";
import {
  integrationTokens,
  type NewIntegrationToken,
} from "../schema";
import { refreshAccessToken } from "@/lib/integrations/spotify";

export async function getIntegrationToken(provider: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(integrationTokens)
    .where(eq(integrationTokens.provider, provider))
    .limit(1);
  return row ?? null;
}

/**
 * Insert or update — there can be only one row per provider, enforced by
 * the unique constraint. We use ON CONFLICT to handle both first-time
 * connect and reconnect (e.g., user disconnected then re-authed) in a
 * single statement.
 */
export async function upsertIntegrationToken(
  input: Omit<NewIntegrationToken, "id" | "createdAt" | "updatedAt">,
) {
  const db = getDb();
  await db
    .insert(integrationTokens)
    .values(input)
    .onConflictDoUpdate({
      target: integrationTokens.provider,
      set: {
        accessToken: input.accessToken,
        refreshToken: input.refreshToken,
        expiresAt: input.expiresAt,
        scope: input.scope,
        updatedAt: new Date(),
      },
    });
}

/**
 * Return a valid Spotify access token, refreshing via the Spotify token
 * endpoint if the stored token is expired (or about to expire in <60 s).
 * Returns null if no token exists or refresh isn't possible.
 */
export async function getValidSpotifyAccessToken(): Promise<string | null> {
  const token = await getIntegrationToken("spotify");
  if (!token) return null;

  const BUFFER_MS = 60_000;
  const stillValid =
    token.expiresAt &&
    token.expiresAt.getTime() - Date.now() > BUFFER_MS;

  if (stillValid) return token.accessToken;

  if (!token.refreshToken) return null;

  const refreshed = await refreshAccessToken(token.refreshToken);
  const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000);

  await upsertIntegrationToken({
    provider: "spotify",
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token ?? token.refreshToken,
    expiresAt: newExpiresAt,
    scope: refreshed.scope,
  });

  return refreshed.access_token;
}

export async function deleteIntegrationToken(provider: string) {
  const db = getDb();
  await db
    .delete(integrationTokens)
    .where(eq(integrationTokens.provider, provider));
}
