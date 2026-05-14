/**
 * Database client.
 *
 * Call `getDb()` from server code (server components, server actions,
 * API routes) to query the database. The first call constructs the client
 * lazily; subsequent calls return the cached instance.
 *
 * Why lazy:
 *   `next build` evaluates every page module to read exports like `dynamic`
 *   and `metadata`. If the DB client construction (or its env-var check)
 *   ran at module load, the build would fail anywhere DATABASE_URL isn't
 *   set — including GitHub Actions CI, which doesn't have it. Deferring
 *   construction means imports are side-effect-free and only request-time
 *   code paths actually need the env var.
 *
 * NEVER import this from a client component — `import "server-only"` will
 * cause a build error if you do.
 */

import "server-only";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

type DbInstance = NeonHttpDatabase<typeof schema>;

let _db: DbInstance | undefined;

export function getDb(): DbInstance {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  _db = drizzle(neon(url), { schema });
  return _db;
}
