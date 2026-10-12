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
  setFolderPublic,
  setNotePublic,
  setPhotoPublic,
  setJournalPublic,
} from "@/lib/db/queries/vault";
import {
  RESERVED_FOLDER_SLUGS,
  LEGACY_GENERAL_SLUG,
  KINDS,
  normalizePath,
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

const CHMOD_USAGE = "usage: chmod +r|-r <path>   (+r = visible to guests, -r = hidden)";

/**
 * chmodAction — flips `is_public` on a folder or file.
 *
 *   chmod -r secret-notes/   → hidden: guests see it in red, cd/cat refuse
 *   chmod +r secret-notes/   → visible to everyone again
 *
 * Why "r"? In Unix, `r` is the read bit, and a guest's only power in the vault
 * is reading. Removing read = hiding. We only support +r / -r (not the full
 * rwx / octal grammar) because is_public is a single boolean — a bigger
 * syntax would promise permissions the data model can't express.
 *
 * Path is resolved against the cwd the client sends. A folder match wins over
 * a file match; since folder slugs are kebab-case and note names usually carry
 * an extension, collisions are rare and the rule is easy to predict.
 */
export async function chmodAction(input: {
  cwd: string[];
  arg: string;
}): Promise<CmdResult> {
  // Auth is re-verified on the server on EVERY call — the client's isAdmin
  // flag is only a UI hint and can be faked from devtools.
  try {
    await requireCurrentUser();
  } catch {
    return { ok: false, message: "permission denied — run 'admin login'" };
  }

  const trimmed = input.arg.trim();
  const mode = trimmed.split(/\s+/)[0] ?? "";
  const target = trimmed.slice(mode.length).trim();
  if (!mode || !target) return { ok: false, message: `chmod: ${CHMOD_USAGE}` };
  if (mode !== "+r" && mode !== "-r") {
    return { ok: false, message: `chmod: invalid mode '${mode}' — ${CHMOD_USAGE}` };
  }
  const makePublic = mode === "+r";
  const verb = makePublic ? "visible" : "hidden";

  const path = normalizePath(target, input.cwd);
  if (!path) return { ok: false, message: `chmod: '${target}': no such file or folder` };
  if (path.length === 0) {
    return { ok: false, message: "chmod: cannot change the vault root" };
  }

  // /general/notes|photos|journal are virtual directories (filters over one
  // folder), not DB rows — there is nothing to flip.
  if (
    path.length === 2 &&
    path[0] === LEGACY_GENERAL_SLUG &&
    (KINDS as string[]).includes(path[1]!)
  ) {
    return {
      ok: false,
      message: `chmod: '${path[1]}' is a virtual directory — chmod the files inside it`,
    };
  }

  // 1) Folder?
  const folder = await getFolderByPath(path);
  if (folder) {
    await setFolderPublic(folder.id, makePublic);
    revalidatePath("/vault/home");
    return { ok: true, message: `${path.join("/")}/ is now ${verb}` };
  }

  // 2) File? Parent is everything but the last segment. Same legacy rule as
  // touch/rm: inside /general/<kind>, files really live in /general.
  const name = path[path.length - 1]!;
  const parentPath = path.slice(0, -1);
  const folderPath =
    parentPath.length === 2 && parentPath[0] === LEGACY_GENERAL_SLUG
      ? [LEGACY_GENERAL_SLUG]
      : parentPath;
  const notFound = { ok: false, message: `chmod: '${target}': no such file or folder` } as const;
  if (folderPath.length === 0) return notFound; // files can't live at the root
  const parent = await getFolderByPath(folderPath);
  if (!parent) return notFound;

  const note = await findNoteByName(parent.id, name);
  if (note) {
    await setNotePublic(note.id, makePublic);
    revalidatePath("/vault/home");
    return { ok: true, message: `${name} is now ${verb}` };
  }
  const photo = await findPhotoByName(parent.id, name);
  if (photo) {
    await setPhotoPublic(photo.id, makePublic);
    revalidatePath("/vault/home");
    return { ok: true, message: `${name} is now ${verb}` };
  }
  const journal = await findJournalByName(parent.id, name.replace(/\.md$/, ""));
  if (journal) {
    await setJournalPublic(journal.id, makePublic);
    revalidatePath("/vault/home");
    return { ok: true, message: `${name} is now ${verb}` };
  }

  return notFound;
}
