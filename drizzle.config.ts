/**
 * Configuration for drizzle-kit (the CLI tool that generates and runs migrations).
 *
 * Note this is a STANDALONE script, not part of your Next.js app — it runs in
 * Node directly when you invoke `drizzle-kit ...`. Next.js auto-loads
 * `.env.local` for your app code, but standalone scripts don't get that for
 * free; we use the `dotenv` package to load it explicitly.
 */

import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

// Load .env.local so DATABASE_URL_UNPOOLED is available below.
config({ path: ".env.local" });

if (!process.env.DATABASE_URL_UNPOOLED) {
  throw new Error(
    "DATABASE_URL_UNPOOLED is not set. Run `vercel env pull .env.local` to fetch it.",
  );
}

export default defineConfig({
  // Where your TypeScript schema lives — drizzle-kit reads this to know
  // what your tables should look like.
  schema: "./src/lib/db/schema.ts",

  // Where generated SQL migration files go. We commit this folder so all
  // environments apply the same migrations in the same order.
  out: "./drizzle",

  // Postgres dialect (Drizzle also supports MySQL, SQLite, and others).
  dialect: "postgresql",

  // Use the UNPOOLED URL for DDL — PgBouncer in transaction mode
  // (what Neon's pooler uses) doesn't support `CREATE TABLE` etc.
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED,
  },
});
