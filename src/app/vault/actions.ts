"use server";

/**
 * V.3 server actions for the vault terminal.
 *
 * All mutating commands require an authenticated admin — anon terminal
 * commands get a "permission denied" result rendered as a red error line.
 */

import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/lib/auth/auth";
import {
  createVaultFolder,
  deleteVaultFolder,
  getFolderByPath,
  countFolderContents,
  createNoteInFolder,
  findNoteByName,
  findPhotoByName,
  findJournalByName,
  deleteVaultNote,
  deleteVaultPhoto,
  deleteVaultJournalEntry,
} from "@/lib/db/queries/vault";
import {
  RESERVED_FOLDER_SLUGS,
  LEGACY_GENERAL_SLUG,
} from "@/lib/vault/filesystem";

export type CmdResult =
  | { ok: true; message?: string }
  | { ok: false; message: string };

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function validateSlug(input: string): string | null {
  const s = input.trim().toLowerCase();
  if (!s) return "name is required";
  if (s.length > 120) return "name too long (max 120)";
  if (!SLUG_RE.test(s)) return "name must be kebab-case (a-z, 0-9, hyphens)";
  if (RESERVED_FOLDER_SLUGS.has(s)) return `'${s}' is reserved`;
  return null;
}

/**
 * mkdirAction — creates a folder at the given path. Path is relative to
 * the current cwd. If the path has multiple segments, all but the last
 * must already exist (no `mkdir -p` behavior).
 */
export async function mkdirAction(input: {
  cwd: string[];
  arg: string;
}): Promise<CmdResult> {
  try {
    await requireCurrentUser();
  } catch {
    return { ok: false, message: "permission denied — run 'admin login'" };
  }

  const arg = input.arg.trim();
  if (!arg) return { ok: false, message: "mkdir: missing name" };

  // Resolve target path: if arg contains slashes, treat as a subpath from cwd;
  // otherwise create in cwd.
  const parts = arg.split("/").filter(Boolean);
  const newSlug = parts.pop()!;
  const parentPath = [...input.cwd, ...parts];

  const err = validateSlug(newSlug);
  if (err) return { ok: false, message: `mkdir: ${err}` };

  // Resolve parent id
  let parentId: number | null = null;
  if (parentPath.length > 0) {
    const parent = await getFolderByPath(parentPath);
    if (!parent) {
      return {
        ok: false,
        message: `mkdir: parent '${parentPath.join("/")}' not found`,
      };
    }
    parentId = parent.id;
  }

  // Check for duplicate under same parent
  const existing = await getFolderByPath([...parentPath, newSlug]);
  if (existing) {
    return { ok: false, message: `mkdir: '${newSlug}' already exists` };
  }

  await createVaultFolder({
    slug: newSlug,
    name: newSlug,
    parentId,
  });
  revalidatePath("/vault/home");
  return { ok: true, message: `created ${newSlug}/` };
}

/** rmdirAction — deletes an empty folder at a path relative to cwd. */
export async function rmdirAction(input: {
  cwd: string[];
  arg: string;
}): Promise<CmdResult> {
  try {
    await requireCurrentUser();
  } catch {
    return { ok: false, message: "permission denied — run 'admin login'" };
  }

  const arg = input.arg.trim();
  if (!arg) return { ok: false, message: "rmdir: missing name" };

  const parts = arg.split("/").filter(Boolean);
  const path = [...input.cwd, ...parts];

  // Refuse to delete /general — it's the legacy default and holds pre-V.1 content
  if (path.length === 1 && path[0] === LEGACY_GENERAL_SLUG) {
    return { ok: false, message: "rmdir: cannot delete the default folder" };
  }

  const folder = await getFolderByPath(path);
  if (!folder) return { ok: false, message: `rmdir: '${arg}': no such folder` };

  const hasContents = await countFolderContents(folder.id);
  if (hasContents) {
    return {
      ok: false,
      message: `rmdir: '${arg}' not empty — delete files first`,
    };
  }

  await deleteVaultFolder(folder.id);
  revalidatePath("/vault/home");
  return { ok: true, message: `removed ${arg}/` };
}

/**
 * touchAction — creates an empty text file in the current folder. In the
 * legacy /general folder, respects the kind sub-dir (notes/photos/journal).
 * Elsewhere, always creates a note.
 *
 * Filename convention: a filename matching YYYY-MM-DD.md creates a journal
 * entry instead of a note. This preserves the journal concept for anyone
 * who wants date-keyed entries without needing a separate command.
 */
export async function touchAction(input: {
  cwd: string[];
  arg: string;
}): Promise<CmdResult> {
  try {
    await requireCurrentUser();
  } catch {
    return { ok: false, message: "permission denied — run 'admin login'" };
  }

  const name = input.arg.trim();
  if (!name) return { ok: false, message: "touch: missing filename" };

  // Photos need bytes — refuse.
  if (/\.(jpg|jpeg|png|gif|webp)$/i.test(name)) {
    return { ok: false, message: "touch: photos need bytes — upload command coming later" };
  }

  // Resolve target folder. In legacy general kind sub-dirs, the parent is /general.
  const legacy = input.cwd.length === 2 && input.cwd[0] === LEGACY_GENERAL_SLUG
    ? input.cwd[1]
    : null;

  const folderPath = legacy ? [LEGACY_GENERAL_SLUG] : input.cwd;
  if (folderPath.length === 0) {
    return { ok: false, message: "touch: cd into a folder first" };
  }
  const folder = await getFolderByPath(folderPath);
  if (!folder) return { ok: false, message: "touch: folder not found" };

  // Journal detection: YYYY-MM-DD.md → journal entry
  const journalMatch = name.match(/^(\d{4}-\d{2}-\d{2})\.md$/);
  const isLegacyJournalDir = legacy === "journal";
  const isLegacyPhotoDir = legacy === "photos";

  if (isLegacyPhotoDir) {
    return { ok: false, message: "touch: photos need bytes — upload command coming later" };
  }

  if (isLegacyJournalDir || journalMatch) {
    const entryDate = journalMatch ? journalMatch[1]! : name.replace(/\.md$/, "");
    const dup = await findJournalByName(folder.id, entryDate);
    if (dup) return { ok: false, message: `touch: '${name}' already exists` };
    const { createJournalInFolder } = await import("@/lib/db/queries/vault");
    await createJournalInFolder({ folderId: folder.id, entryDate, content: "" });
    revalidatePath("/vault/home");
    return { ok: true, message: `created ${name}` };
  }

  // Default: create a note
  const dup = await findNoteByName(folder.id, name);
  if (dup) return { ok: false, message: `touch: '${name}' already exists` };
  await createNoteInFolder({ folderId: folder.id, slug: name, content: "" });
  revalidatePath("/vault/home");
  return { ok: true, message: `created ${name}` };
}

/** rmAction — deletes a file in the current folder. Kind inferred by lookup. */
export async function rmAction(input: {
  cwd: string[];
  arg: string;
}): Promise<CmdResult> {
  try {
    await requireCurrentUser();
  } catch {
    return { ok: false, message: "permission denied — run 'admin login'" };
  }

  const name = input.arg.trim();
  if (!name) return { ok: false, message: "rm: missing filename" };

  // Same legacy-folder-resolution as touch
  const legacy = input.cwd.length === 2 && input.cwd[0] === LEGACY_GENERAL_SLUG
    ? input.cwd[1]
    : null;
  const folderPath = legacy ? [LEGACY_GENERAL_SLUG] : input.cwd;
  if (folderPath.length === 0) {
    return { ok: false, message: "rm: cd into a folder first" };
  }
  const folder = await getFolderByPath(folderPath);
  if (!folder) return { ok: false, message: "rm: folder not found" };

  // Try each kind in turn (matches the ls union behavior).
  const note = await findNoteByName(folder.id, name);
  if (note) {
    await deleteVaultNote(note.id);
    revalidatePath("/vault/home");
    return { ok: true, message: `removed ${name}` };
  }
  const photo = await findPhotoByName(folder.id, name);
  if (photo) {
    await deleteVaultPhoto(photo.id);
    revalidatePath("/vault/home");
    return { ok: true, message: `removed ${name}` };
  }
  // Journal entries stored with entryDate as name; the ls view suffixes ".md"
  const journalKey = name.replace(/\.md$/, "");
  const j = await findJournalByName(folder.id, journalKey);
  if (j) {
    await deleteVaultJournalEntry(j.id);
    revalidatePath("/vault/home");
    return { ok: true, message: `removed ${name}` };
  }

  return { ok: false, message: `rm: '${name}': no such file` };
}
