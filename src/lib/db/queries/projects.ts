/**
 * Project queries. Importable from any server component, server action, or
 * API route. Importing from a client component will fail at build time
 * because of `import "server-only"` in ../index.ts.
 */

import "server-only";
import { asc, eq } from "drizzle-orm";
import { getDb } from "../index";
import { projects, type NewProject } from "../schema";

/**
 * Returns every project, ordered by displayOrder ascending.
 * Used by /projects (the full grid) and the admin list.
 */
export async function getAllProjects() {
  const db = getDb();
  return await db
    .select()
    .from(projects)
    .orderBy(asc(projects.displayOrder));
}

/**
 * Returns only projects with featured=true, ordered by displayOrder.
 * Used by the front page hero section. The admin "Show on front-page hero"
 * checkbox controls this flag.
 */
export async function getFeaturedProjects() {
  const db = getDb();
  return await db
    .select()
    .from(projects)
    .where(eq(projects.featured, true))
    .orderBy(asc(projects.displayOrder));
}

export async function getProjectById(id: number) {
  const db = getDb();
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);
  return project ?? null;
}

/**
 * NewProject is the inferred Drizzle insert type. We omit `id`,
 * `createdAt`, and `updatedAt` because they're set by the DB.
 */
export type CreateProjectInput = Omit<
  NewProject,
  "id" | "createdAt" | "updatedAt"
>;

export async function createProject(input: CreateProjectInput) {
  const db = getDb();
  const [created] = await db.insert(projects).values(input).returning();
  return created;
}

export async function updateProject(id: number, input: Partial<CreateProjectInput>) {
  const db = getDb();
  const [updated] = await db
    .update(projects)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(projects.id, id))
    .returning();
  return updated ?? null;
}

export async function deleteProject(id: number) {
  const db = getDb();
  const [deleted] = await db
    .delete(projects)
    .where(eq(projects.id, id))
    .returning({ id: projects.id });
  return deleted ?? null;
}
