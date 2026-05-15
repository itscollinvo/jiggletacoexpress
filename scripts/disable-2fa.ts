/**
 * Emergency: clears the TOTP secret for the admin user, effectively
 * disabling 2FA. Use if you lose your phone or the verify endpoint is
 * broken and you can't log in.
 *
 * Usage:
 *   1. Add to .env.local TEMPORARILY:
 *        ADMIN_EMAIL=collinvo26@gmail.com
 *   2. Run:
 *        npx tsx scripts/disable-2fa.ts
 *   3. Delete that line from .env.local.
 *
 * After running: log in with just password, re-enable 2FA from
 * /admin/security if you still want it.
 */

import { config } from "dotenv";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";

import { users } from "../src/lib/db/schema";

config({ path: ".env.local" });

const rawEmail = process.env.ADMIN_EMAIL;
if (!rawEmail) {
  console.error("Set ADMIN_EMAIL in .env.local");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const email = rawEmail.trim().toLowerCase();
const db = drizzle(neon(process.env.DATABASE_URL), { schema: { users } });

async function disable() {
  const result = await db
    .update(users)
    .set({ totpSecret: null })
    .where(eq(users.email, email))
    .returning({ id: users.id });

  if (result.length === 0) {
    console.error(`No user found with email ${email}.`);
    process.exit(1);
  }

  console.log(`Cleared totpSecret for user id=${result[0].id}.`);
  console.log("You can now log in with just your password.");
}

disable()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Disable failed:", err);
    process.exit(1);
  });
