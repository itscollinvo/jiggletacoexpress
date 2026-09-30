import "server-only";
import { and, eq, desc, asc, isNull } from "drizzle-orm";
import { getDb } from "../index";
import {
  vaultFolders,
  vaultPhotos, type NewVaultPhoto,
  vaultNotes, type NewVaultNote,
  vaultJournal, type NewVaultJournalEntry,
} from "../schema";

// ── Photos ────────────────────────────────────────────────────────────────────

export async function getAllVaultPhotos() {
  const db = getDb();
  return db
    .select()
    .from(vaultPhotos)
    .orderBy(desc(vaultPhotos.createdAt));
}

export async function createVaultPhoto(
  input: Omit<NewVaultPhoto, "id" | "createdAt" | "updatedAt">,
) {
  const db = getDb();
  const [row] = await db.insert(vaultPhotos).values(input).returning();
  return row;
}

export async function deleteVaultPhoto(id: number) {
  const db = getDb();
  await db.delete(vaultPhotos).where(eq(vaultPhotos.id, id));
}

// ── Notes ─────────────────────────────────────────────────────────────────────

export async function getAllVaultNotes() {
  const db = getDb();
  return db
    .select()
    .from(vaultNotes)
    .orderBy(desc(vaultNotes.createdAt));
}

export async function createVaultNote(
  input: Omit<NewVaultNote, "id" | "createdAt" | "updatedAt">,
) {
  const db = getDb();
  const [row] = await db.insert(vaultNotes).values(input).returning();
  return row;
}

export async function deleteVaultNote(id: number) {
  const db = getDb();
  await db.delete(vaultNotes).where(eq(vaultNotes.id, id));
}

// ── Journal ───────────────────────────────────────────────────────────────────

export async function getAllVaultJournal() {
  const db = getDb();
  return db
    .select()
    .from(vaultJournal)
    .orderBy(desc(vaultJournal.createdAt));
}

export async function createVaultJournalEntry(
  input: Omit<NewVaultJournalEntry, "id" | "createdAt" | "updatedAt">,
) {
  const db = getDb();
  const [row] = await db.insert(vaultJournal).values(input).returning();
  return row;
}

export async function deleteVaultJournalEntry(id: number) {
  const db = getDb();
  await db.delete(vaultJournal).where(eq(vaultJournal.id, id));
}

// ── Folders (V.1/V.2) ────────────────────────────────────────────────────────

export async function getAllVaultFolders() {
  const db = getDb();
  return db
    .select()
    .from(vaultFolders)
    .orderBy(asc(vaultFolders.sortOrder), asc(vaultFolders.name));
}

/** Direct children of a given folder id, or all root folders if null. */
export async function getChildFolders(parentId: number | null) {
  const db = getDb();
  const q = db
    .select()
    .from(vaultFolders)
    .orderBy(asc(vaultFolders.sortOrder), asc(vaultFolders.name));
  return parentId === null
    ? q.where(isNull(vaultFolders.parentId))
    : q.where(eq(vaultFolders.parentId, parentId));
}

export async function getVaultFolderBySlug(slug: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(vaultFolders)
    .where(eq(vaultFolders.slug, slug))
    .limit(1);
  return row ?? null;
}

export async function createVaultFolder(input: {
  slug: string;
  name: string;
  parentId: number | null;
  description?: string;
}) {
  const db = getDb();
  const [row] = await db
    .insert(vaultFolders)
    .values({
      slug: input.slug,
      name: input.name,
      parentId: input.parentId,
      description: input.description ?? "",
    })
    .returning();
  return row;
}

/**
 * Look up a folder by an ordered array of slugs from root. Walks the tree
 * with N sequential queries (one per level). Fine for the typical 1–3
 * levels this vault will ever have.
 */
export async function getFolderByPath(
  path: string[],
): Promise<{ id: number; slug: string; isPublic: boolean } | null> {
  if (path.length === 0) return null;
  const db = getDb();
  let parentId: number | null = null;
  let last: { id: number; slug: string; isPublic: boolean } | null = null;
  for (const slug of path) {
    const [row]: Array<{ id: number; slug: string; isPublic: boolean }> = await db
      .select({
        id: vaultFolders.id,
        slug: vaultFolders.slug,
        isPublic: vaultFolders.isPublic,
      })
      .from(vaultFolders)
      .where(
        and(
          eq(vaultFolders.slug, slug),
          parentId === null
            ? isNull(vaultFolders.parentId)
            : eq(vaultFolders.parentId, parentId),
        ),
      )
      .limit(1);
    if (!row) return null;
    parentId = row.id;
    last = row;
  }
  return last;
}

export async function deleteVaultFolder(id: number) {
  const db = getDb();
  await db.delete(vaultFolders).where(eq(vaultFolders.id, id));
}

/**
 * Count how many items live in a folder. Used before rmdir to enforce
 * the "empty folder only" rule (the DB's ON DELETE RESTRICT also enforces
 * it at the storage layer).
 */
export async function countFolderContents(folderId: number) {
  const db = getDb();
  const [{ n: n1 } = { n: 0 }] = await db
    .select({ n: vaultNotes.id })
    .from(vaultNotes)
    .where(eq(vaultNotes.folderId, folderId))
    .limit(1);
  const [{ n: n2 } = { n: 0 }] = await db
    .select({ n: vaultPhotos.id })
    .from(vaultPhotos)
    .where(eq(vaultPhotos.folderId, folderId))
    .limit(1);
  const [{ n: n3 } = { n: 0 }] = await db
    .select({ n: vaultJournal.id })
    .from(vaultJournal)
    .where(eq(vaultJournal.folderId, folderId))
    .limit(1);
  // We only need to know whether it's empty, not the exact count.
  return n1 || n2 || n3 ? 1 : 0;
}

// ── Folder-scoped item creation/deletion for the terminal write commands ──

export async function createNoteInFolder(input: {
  folderId: number;
  slug: string;
  content?: string;
}) {
  const db = getDb();
  const [row] = await db
    .insert(vaultNotes)
    .values({
      folderId: input.folderId,
      slug: input.slug,
      content: input.content ?? "",
    })
    .returning();
  return row;
}

export async function createJournalInFolder(input: {
  folderId: number;
  entryDate: string;
  content?: string;
}) {
  const db = getDb();
  const [row] = await db
    .insert(vaultJournal)
    .values({
      folderId: input.folderId,
      entryDate: input.entryDate,
      content: input.content ?? "",
    })
    .returning();
  return row;
}

export async function findNoteByName(folderId: number, slug: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(vaultNotes)
    .where(and(eq(vaultNotes.folderId, folderId), eq(vaultNotes.slug, slug)))
    .limit(1);
  return row ?? null;
}

export async function findPhotoByName(folderId: number, filename: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(vaultPhotos)
    .where(
      and(eq(vaultPhotos.folderId, folderId), eq(vaultPhotos.filename, filename)),
    )
    .limit(1);
  return row ?? null;
}

export async function findJournalByName(folderId: number, entryDate: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(vaultJournal)
    .where(
      and(eq(vaultJournal.folderId, folderId), eq(vaultJournal.entryDate, entryDate)),
    )
    .limit(1);
  return row ?? null;
}
