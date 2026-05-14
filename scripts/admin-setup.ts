/**
 * One-time admin bootstrap.
 *
 * Usage:
 *   1. Add to .env.local TEMPORARILY:
 *        ADMIN_EMAIL=you@example.com
 *        ADMIN_PASSWORD=some-strong-password
 *   2. Run:
 *        npm run admin:setup
 *   3. Delete those two lines from .env.local immediately after.
 *
 * `.env.local` is gitignored, so the password never reaches your repo.
 * After this runs, the password is stored in the DB only as a bcrypt hash.
 *
 * Idempotent: if a user with that email already exists, updates the password
 * instead of creating a duplicate. Useful if you forget your password.
 */

import { config } from "dotenv";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

import { users } from "../src/lib/db/schema";

config({ path: ".env.local" });

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

if (!email || !password) {
  console.error(
    "Missing ADMIN_EMAIL or ADMIN_PASSWORD in .env.local. See top of this file.",
  );
  process.exit(1);
}

if (password.length < 12) {
  console.error("ADMIN_PASSWORD must be at least 12 characters.");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const db = drizzle(neon(process.env.DATABASE_URL), { schema: { users } });

async function setup() {
  // We've already validated email and password are non-empty above; this
  // assertion narrows the types for the rest of the function.
  const adminEmail = email!;
  const adminPassword = password!;

  console.log(`Hashing password (cost factor 12, ~250ms)...`);
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, adminEmail))
    .limit(1);

  if (existing.length > 0) {
    console.log(`User ${adminEmail} exists — updating password.`);
    await db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.email, adminEmail));
  } else {
    console.log(`Creating user ${adminEmail}.`);
    await db.insert(users).values({ email: adminEmail, passwordHash });
  }

  console.log(
    "\nDone. NOW delete ADMIN_EMAIL and ADMIN_PASSWORD from .env.local.",
  );
}

setup()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Setup failed:", err);
    process.exit(1);
  });
