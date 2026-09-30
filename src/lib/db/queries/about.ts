import "server-only";
import { asc, eq } from "drizzle-orm";
import { getDb } from "../index";
import {
  aboutNow,
  timelineEntries,
  aboutPhotos,
} from "../schema";

/* about_now — upsert by slug */
const NOW_SLUG = "current";

export async function getNow() {
  const db = getDb();
  const [row] = await db
    .select()
    .from(aboutNow)
    .where(eq(aboutNow.slug, NOW_SLUG))
    .limit(1);
  return row ?? null;
}

/** Upsert the single "current" row. Insert on first save, update after. */
export async function upsertNow(content: string) {
  const db = getDb();
  const existing = await getNow();
  if (existing) {
    const [updated] = await db
      .update(aboutNow)
      .set({ content, updatedAt: new Date() })
      .where(eq(aboutNow.slug, NOW_SLUG))
      .returning();
    return updated;
  }
  const [created] = await db
    .insert(aboutNow)
    .values({ slug: NOW_SLUG, content })
    .returning();
  return created;
}

/* timeline_entries */

export async function getTimelineEntries() {
  const db = getDb();
  return await db
    .select()
    .from(timelineEntries)
    .orderBy(asc(timelineEntries.sortOrder));
}

export async function getTimelineEntryById(id: number) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(timelineEntries)
    .where(eq(timelineEntries.id, id))
    .limit(1);
  return row ?? null;
}

export async function createTimelineEntry(input: {
  year: string;
  title: string;
  description: string;
  icon: string | null;
  sortOrder: number;
}) {
  const db = getDb();
  const [created] = await db
    .insert(timelineEntries)
    .values(input)
    .returning();
  return created;
}

export async function updateTimelineEntry(
  id: number,
  input: Partial<{
    year: string;
    title: string;
    description: string;
    icon: string | null;
    sortOrder: number;
  }>,
) {
  const db = getDb();
  const [updated] = await db
    .update(timelineEntries)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(timelineEntries.id, id))
    .returning();
  return updated ?? null;
}

export async function deleteTimelineEntry(id: number) {
  const db = getDb();
  await db.delete(timelineEntries).where(eq(timelineEntries.id, id));
}

/* about_photos */

export async function getAboutPhotos() {
  const db = getDb();
  return await db
    .select()
    .from(aboutPhotos)
    .orderBy(asc(aboutPhotos.sortOrder));
}

export async function createAboutPhoto(input: {
  url: string;
  caption: string | null;
  sortOrder: number;
}) {
  const db = getDb();
  const [created] = await db.insert(aboutPhotos).values(input).returning();
  return created;
}

export async function deleteAboutPhoto(id: number) {
  const db = getDb();
  await db.delete(aboutPhotos).where(eq(aboutPhotos.id, id));
}
