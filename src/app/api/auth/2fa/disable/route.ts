import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireCurrentUser } from "@/lib/auth/auth";
import { verifyTotpCode } from "@/lib/auth/totp";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";

/**
 * Disables 2FA. Requires a valid current TOTP code as proof that the user
 * still has access to the authenticator (not just a stolen session cookie).
 *
 * Body (JSON): { code: string }
 */
export async function POST(request: NextRequest) {
  const user = await requireCurrentUser();

  if (!user.totpSecret) {
    return NextResponse.json(
      { error: "2FA is not enabled." },
      { status: 400 },
    );
  }

  const body = await request.json().catch(() => null);
  const code = body?.code;
  if (typeof code !== "string") {
    return NextResponse.json({ error: "Missing code." }, { status: 400 });
  }

  if (!verifyTotpCode(code, user.totpSecret)) {
    return NextResponse.json({ error: "Invalid code." }, { status: 400 });
  }

  const db = getDb();
  await db
    .update(users)
    .set({ totpSecret: null })
    .where(eq(users.id, user.id));

  return NextResponse.json({ ok: true });
}
