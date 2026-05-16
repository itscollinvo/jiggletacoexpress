import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth/auth";
import { deleteIntegrationToken } from "@/lib/db/queries/integration-tokens";

/**
 * Removes the Spotify token row, effectively disconnecting.
 *
 * Note: this only removes our local copy. The user can also revoke from
 * their Spotify account settings (https://www.spotify.com/account/apps/),
 * which invalidates the refresh token server-side. After revoking from
 * Spotify, our refresh attempts will fail; we'd need to delete the row
 * and re-auth. We don't bother triggering Spotify-side revocation here
 * (no API for it short of the user logging in to spotify.com).
 */
export async function POST(request: Request) {
  await requireCurrentUser();
  await deleteIntegrationToken("spotify");

  const target = new URL("/admin/integrations", request.url);
  target.searchParams.set("spotify", "disconnected");
  return NextResponse.redirect(target, 303);
}
