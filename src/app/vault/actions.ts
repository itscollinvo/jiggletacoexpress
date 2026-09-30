"use server";

/**
 * Server actions invoked by terminal write commands (mkdir/rmdir/touch/rm)
 * plus `admin logout` (login uses the existing /api/auth/login endpoint
 * directly from the client — no server action needed).
 *
 * Every mutation calls requireCurrentUser() so a guest running commands
 * gets a proper 401-equivalent. The terminal renders the thrown error as
 * a red line — matches Unix's "permission denied" vibe.
 */

import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/lib/auth/auth";
import {
  createVaultFolder,
  deleteVaultFolder,
  getVaultFolderBySlug,
  countFolderContents,
  createNoteInFolder,
  createJournalInFolder,
  findNoteByName,
  findPhotoByName,
  findJournalByName,
  deleteVaultNote,
  deleteVaultPhoto,
  deleteVaultJournalEntry,
} from "@/lib/db/queries/vault";
import { RESERVED_FOLDER_SLUGS, type FileKind } from "@/lib/vault/filesystem";

/**
 * Consistent result shape for terminal commands. `ok:false` messages get
 * rendered as red error lines; `ok:true` may include a message shown as a
 * dim output line ("created folder 'climbing-2025'").
 */
export type CmdResult =
  | { ok: true; message?: string }
  | { ok: false; message: string };

/** Kebab-case validator for folder slugs — same rules as blog + projects. */
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function validateFolderSlug(input: string): string | null {
  const s = input.trim().toLowerCase();
  if (!s) return "folder name is required";
  if (s.length > 120) return "folder name too long (max 120)";
  if (!SLUG_RE.test(s)) return "folder name must be kebab-case (a-z, 0-9, hyphens)";
  if (RESERVED_FOLDER_SLUGS.has(s)) return `'${s}' is reserved`;
  return null;
}

/* ----- mkdir ----- */

export async function mkdirAction(slug: string): Promise<CmdResult> {
  try {
    await requireCurrentUser();
  } catch {
    return { ok: false, message: "permission denied — run 'admin login'" };
  }

  const err = validateFolderSlug(slug);
  if (err) return { ok: false, message: `mkdir: ${err}` };

  const cleaned = slug.trim().toLowerCase();
  const existing = await getVaultFolderBySlug(cleaned);
  if (existing) return { ok: false, message: `mkdir: '${cleaned}' already exists` };

  await createVaultFolder({ slug: cleaned, name: cleaned });
  revalidatePath("/vault/home");
  return { ok: true, message: `created folder '${cleaned}'` };
}

/* ----- rmdir ----- */

export async function rmdirAction(slug: string): Promise<CmdResult> {
  try {
    await requireCurrentUser();
  } catch {
    return { ok: false, message: "permission denied — run 'admin login'" };
  }

  const cleaned = slug.trim().toLowerCase();
  const folder = await getVaultFolderBySlug(cleaned);
  if (!folder) return { ok: false, message: `rmdir: '${cleaned}': no such folder` };
  if (folder.slug === "general") {
    return { ok: false, message: "rmdir: cannot delete the default folder" };
  }

  const hasContents = await countFolderContents(folder.id);
  if (hasContents) {
    return { ok: false, message: `rmdir: '${cleaned}' not empty — delete files first` };
  }

  await deleteVaultFolder(folder.id);
  revalidatePath("/vault/home");
  return { ok: true, message: `removed folder '${cleaned}'` };
}

/* ----- touch (in a kind dir) ----- */

/**
 * Create an empty note or journal entry in the current folder + kind.
 * Photos can't be `touch`ed — they need real image bytes; use upload later.
 */
export async function touchAction(input: {
  folderSlug: string;
  kind: FileKind;
  name: string;
}): Promise<CmdResult> {
  try {
    await requireCurrentUser();
  } catch {
    return { ok: false, message: "permission denied — run 'admin login'" };
  }

  const folder = await getVaultFolderBySlug(input.folderSlug);
  if (!folder) return { ok: false, message: `touch: folder '${input.folderSlug}' not found` };

  const name = input.name.trim();
  if (!name) return { ok: false, message: "touch: filename is required" };

  if (input.kind === "photos") {
    return {
      ok: false,
      message: "touch: photos need bytes — try upload (coming later)",
    };
  }

  if (input.kind === "notes") {
    const dup = await findNoteByName(folder.id, name);
    if (dup) return { ok: false, message: `touch: '${name}' already exists` };
    await createNoteInFolder({ folderId: folder.id, slug: name, content: "" });
    revalidatePath("/vault/home");
    return { ok: true, message: `created ${name}` };
  }

  // journal
  const dup = await findJournalByName(folder.id, name);
  if (dup) return { ok: false, message: `touch: '${name}' already exists` };
  await createJournalInFolder({ folderId: folder.id, entryDate: name, content: "" });
  revalidatePath("/vault/home");
  return { ok: true, message: `created ${name}` };
}

/* ----- rm (in a kind dir) ----- */

export async function rmAction(input: {
  folderSlug: string;
  kind: FileKind;
  name: string;
}): Promise<CmdResult> {
  try {
    await requireCurrentUser();
  } catch {
    return { ok: false, message: "permission denied — run 'admin login'" };
  }

  const folder = await getVaultFolderBySlug(input.folderSlug);
  if (!folder) return { ok: false, message: `rm: folder '${input.folderSlug}' not found` };

  const name = input.name.trim();
  if (!name) return { ok: false, message: "rm: filename is required" };

  if (input.kind === "notes") {
    const row = await findNoteByName(folder.id, name);
    if (!row) return { ok: false, message: `rm: '${name}': no such file` };
    await deleteVaultNote(row.id);
  } else if (input.kind === "photos") {
    const row = await findPhotoByName(folder.id, name);
    if (!row) return { ok: false, message: `rm: '${name}': no such file` };
    await deleteVaultPhoto(row.id);
  } else {
    const row = await findJournalByName(folder.id, name);
    if (!row) return { ok: false, message: `rm: '${name}': no such file` };
    await deleteVaultJournalEntry(row.id);
  }

  revalidatePath("/vault/home");
  return { ok: true, message: `removed ${name}` };
}
