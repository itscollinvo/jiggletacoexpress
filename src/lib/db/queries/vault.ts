import "server-only";
import { eq, desc } from "drizzle-orm";
import { getDb } from "../index";
import {
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
