/**
 * Project queries. Importable from any server component, server action, or
 * API route. Importing from a client component will fail at build time
 * because of `import "server-only"` in ../index.ts.
 */

import "server-only";
import { asc } from "drizzle-orm";
import { getDb } from "../index";
import { projects } from "../schema";

/**
 * Returns every project, ordered by displayOrder ascending.
 * Used by both the front page and the /projects grid.
 *
 * In Phase 2d we'll add `getFeaturedProjects()` and have the front page
 * pull only featured ones, while /projects keeps showing everything.
 */
export async function getAllProjects() {
  const db = getDb();
  return await db
    .select()
    .from(projects)
    .orderBy(asc(projects.displayOrder));
}
