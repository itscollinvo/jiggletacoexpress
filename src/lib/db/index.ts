/**
 * Database client.
 *
 * Import `db` anywhere in server code (server components, API routes, server
 * actions) to query the database. NEVER import this from a client component
 * — your DB credentials would leak to the browser. Next.js will yell if you
 * try, because we use `process.env.DATABASE_URL` which only exists server-side.
 */

import "server-only";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// `neon()` returns an HTTP-based SQL client. We wrap it in Drizzle to get
// the typed query builder. We pass `schema` so methods like `db.query.projects`
// can be auto-typed against your tables.
const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });
