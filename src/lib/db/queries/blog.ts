/**
 * Blog post queries. Server-only. Importing from a client component fails
 * at build via the `import "server-only"` in ../index.
 *
 * Query helpers split by audience:
 *   - getAllPosts()        → admin list (drafts + published)
 *   - getPublishedPosts()  → public /blog index
 *   - getPostBySlug()      → public single post (only if published)
 *   - getPostById()        → admin edit form
 */

import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../index";
import { blogPosts, type NewBlogPost } from "../schema";

export async function getAllPosts() {
  const db = getDb();
  return await db
    .select()
    .from(blogPosts)
    .orderBy(desc(blogPosts.updatedAt));
}

export async function getPublishedPosts() {
  const db = getDb();
  return await db
    .select()
    .from(blogPosts)
    .where(eq(blogPosts.status, "published"))
    .orderBy(desc(blogPosts.publishedAt));
}

export async function getPostById(id: number) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(blogPosts)
    .where(eq(blogPosts.id, id))
    .limit(1);
  return row ?? null;
}

export async function getPostBySlug(slug: string, publishedOnly = true) {
  const db = getDb();
  const conditions = publishedOnly
    ? and(eq(blogPosts.slug, slug), eq(blogPosts.status, "published"))
    : eq(blogPosts.slug, slug);
  const [row] = await db
    .select()
    .from(blogPosts)
    .where(conditions)
    .limit(1);
  return row ?? null;
}

/** Distinct slug check — used to reject duplicates in the action layer. */
export async function slugTaken(slug: string, exceptId?: number) {
  const db = getDb();
  const rows = await db
    .select({ id: blogPosts.id })
    .from(blogPosts)
    .where(eq(blogPosts.slug, slug))
    .limit(1);
  const found = rows[0];
  if (!found) return false;
  return exceptId === undefined || found.id !== exceptId;
}

export type CreatePostInput = Omit<
  NewBlogPost,
  "id" | "createdAt" | "updatedAt" | "publishedAt"
>;

export async function createPost(input: CreatePostInput) {
  const db = getDb();
  const publishedAt = input.status === "published" ? new Date() : null;
  const [created] = await db
    .insert(blogPosts)
    .values({ ...input, publishedAt })
    .returning();
  return created;
}

export async function updatePost(
  id: number,
  input: Partial<CreatePostInput>,
) {
  const db = getDb();
  // If a caller flips status to "published" and no publishedAt exists yet,
  // stamp it now. If they flip back to "draft", leave publishedAt alone
  // (so we remember when it was first published if they re-publish).
  const existing = await getPostById(id);
  if (!existing) return null;

  const shouldStampPublishedAt =
    input.status === "published" && existing.publishedAt === null;

  const [updated] = await db
    .update(blogPosts)
    .set({
      ...input,
      updatedAt: new Date(),
      ...(shouldStampPublishedAt ? { publishedAt: new Date() } : {}),
    })
    .where(eq(blogPosts.id, id))
    .returning();
  return updated ?? null;
}

export async function deletePost(id: number) {
  const db = getDb();
  const [deleted] = await db
    .delete(blogPosts)
    .where(eq(blogPosts.id, id))
    .returning({ id: blogPosts.id });
  return deleted ?? null;
}

/** Flip a post between draft and published in one call. */
export async function togglePublish(id: number) {
  const existing = await getPostById(id);
  if (!existing) return null;
  const nextStatus = existing.status === "published" ? "draft" : "published";
  return updatePost(id, { status: nextStatus });
}
