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

export async function deleteIntegrationToken(provider: string) {
  const db = getDb();
  await db
    .delete(integrationTokens)
    .where(eq(integrationTokens.provider, provider));
}
