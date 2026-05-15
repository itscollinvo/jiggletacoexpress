import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireCurrentUser } from "@/lib/auth/auth";
import { verifySetupToken, verifyTotpCode } from "@/lib/auth/totp";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";

/**
 * Confirms 2FA setup.
 *
 * Body (JSON): { setupToken: string, code: string }
 *   setupToken — the JWT issued by /setup, containing the unconfirmed secret
 *   code — the 6-digit number the user just entered from their authenticator
 *
 * On success, persists the secret to user.totpSecret. From the next request
 * onward, the user will be required to enter a TOTP code at login.
 */
export async function POST(request: NextRequest) {
  const user = await requireCurrentUser();

  const body = await request.json().catch(() => null);
  const setupToken = body?.setupToken;
  const code = body?.code;

  if (typeof setupToken !== "string" || typeof code !== "string") {
    return NextResponse.json(
      { error: "Missing setupToken or code." },
      { status: 400 },
    );
  }

  const setup = await verifySetupToken(setupToken);
  if (!setup || setup.userId !== user.id) {
    return NextResponse.json(
      {
        error:
          "Setup session expired or invalid. Restart the setup flow from /admin/security.",
      },
      { status: 400 },
    );
  }

  if (!verifyTotpCode(code, setup.secret)) {
    return NextResponse.json(
      { error: "That code didn't match. Try again with the current code in your app." },
      { status: 400 },
    );
  }

  const db = getDb();
  await db
    .update(users)
    .set({ totpSecret: setup.secret })
    .where(eq(users.id, user.id));

  return NextResponse.json({ ok: true });
}
