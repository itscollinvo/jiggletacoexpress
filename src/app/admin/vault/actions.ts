"use server";

import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";
import { requireCurrentUser } from "@/lib/auth/auth";
import {
  createVaultPhoto, deleteVaultPhoto,
  createVaultNote, deleteVaultNote,
  createVaultJournalEntry, deleteVaultJournalEntry,
} from "@/lib/db/queries/vault";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const MAX_BYTES = 10 * 1024 * 1024; // 10MB — photos may be larger than project thumbnails

export type VaultActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function uploadVaultPhotoAction(
  _prev: VaultActionResult | null,
  formData: FormData,
): Promise<VaultActionResult> {
  await requireCurrentUser();

  const file = formData.get("photo");
  const caption = String(formData.get("caption") ?? "").trim();
  const takenAt = String(formData.get("takenAt") ?? "").trim() || null;

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No file selected." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "File must be 10MB or smaller." };
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return { ok: false, error: "Must be PNG, JPEG, WebP, or GIF." };
  }

  // Derive a clean filename for the terminal (e.g. "joshua-tree.jpg")
  // Strip special chars, lowercase, keep extension
  const ext = file.name.split(".").pop() ?? "jpg";
  const base = file.name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const filename = `${base}.${ext}`;

  const blob = await put(`vault/photos/${Date.now()}-${filename}`, file, {
    access: "public",
    addRandomSuffix: true,
  });

  await createVaultPhoto({ filename, url: blob.url, caption, takenAt });

  revalidatePath("/admin/vault");
  revalidatePath("/vault/home/photos");

  return { ok: true };
}

export async function deleteVaultPhotoAction(formData: FormData) {
  await requireCurrentUser();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;
  await deleteVaultPhoto(id);
  revalidatePath("/admin/vault");
  revalidatePath("/vault/home/photos");
}

// ── Notes ─────────────────────────────────────────────────────────────────────

export async function createVaultNoteAction(
  _prev: VaultActionResult | null,
  formData: FormData,
): Promise<VaultActionResult> {
  await requireCurrentUser();

  const slug = String(formData.get("slug") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const displayDate = String(formData.get("displayDate") ?? "").trim() || null;

  if (!slug) return { ok: false, error: "Filename (slug) is required." };
  if (!content) return { ok: false, error: "Content is required." };

  // Normalise slug: lowercase, spaces → hyphens, ensure .md extension
  const base = slug
    .replace(/\.md$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const normalised = `${base}.md`;

  await createVaultNote({ slug: normalised, content, displayDate });

  revalidatePath("/admin/vault");
  revalidatePath("/vault/home");
  revalidatePath("/vault/home/notes");

  return { ok: true };
}

export async function deleteVaultNoteAction(formData: FormData) {
  await requireCurrentUser();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;
  await deleteVaultNote(id);
  revalidatePath("/admin/vault");
  revalidatePath("/vault/home");
  revalidatePath("/vault/home/notes");
}

// ── Journal ───────────────────────────────────────────────────────────────────

export async function createVaultJournalAction(
  _prev: VaultActionResult | null,
  formData: FormData,
): Promise<VaultActionResult> {
  await requireCurrentUser();

  const entryDate = String(formData.get("entryDate") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();

  if (!entryDate) return { ok: false, error: "Entry date is required." };
  if (!content) return { ok: false, error: "Content is required." };

  await createVaultJournalEntry({ entryDate, content });

  revalidatePath("/admin/vault");
  revalidatePath("/vault/home");
  revalidatePath("/vault/home/journal");

  return { ok: true };
}

export async function deleteVaultJournalAction(formData: FormData) {
  await requireCurrentUser();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;
  await deleteVaultJournalEntry(id);
  revalidatePath("/admin/vault");
  revalidatePath("/vault/home");
  revalidatePath("/vault/home/journal");
}
