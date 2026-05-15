import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth/auth";
import {
  buildOtpauthUrl,
  generateQrDataUrl,
  generateTotpSecret,
  signSetupToken,
} from "@/lib/auth/totp";

/**
 * Begins the 2FA setup flow.
 *
 * Generates a fresh secret in memory, builds the otpauth URL,
 * renders a QR code data URL, and signs a short-lived JWT carrying
 * the unconfirmed secret. The client renders the QR; the user scans
 * it with Google Authenticator / Authy / etc.; then submits a code
 * along with this setupToken back to /api/auth/2fa/confirm.
 *
 * The secret is NOT persisted here — only after the user confirms
 * by entering a valid code. This means you can't accidentally lock
 * yourself out by clicking "Enable" without scanning.
 */
export async function POST() {
  const user = await requireCurrentUser();

  const secret = generateTotpSecret();
  const otpauthUrl = buildOtpauthUrl(user.email, secret);
  const qrDataUrl = await generateQrDataUrl(otpauthUrl);
  const setupToken = await signSetupToken({ userId: user.id, secret });

  return NextResponse.json({
    qrDataUrl,
    // Manual entry fallback — show this to users whose camera can't read the QR
    manualEntryKey: secret,
    setupToken,
  });
}
