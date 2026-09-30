/**
 * Vault virtual filesystem — V.2 (folder-aware).
 *
 * The path model has three levels:
 *   ~                     — root: shows folders
 *   ~/<folder>            — inside a folder: shows notes/ photos/ journal/
 *   ~/<folder>/<kind>     — inside a kind dir: shows individual files
 *
 * The terminal reads `VaultData` produced by /vault/home/page.tsx, then
 * navigates via the `Cwd` shape (folder + kind, both nullable). All writes
 * go through server actions in src/app/vault/actions.ts.
 */

export type FileKind = "notes" | "photos" | "journal";

export const KINDS: FileKind[] = ["notes", "photos", "journal"];

/**
 * Slugs the vault filesystem refuses to accept — reserved for routes
 * we own (/vault/home, /admin, etc.) or paths that would be confusing.
 * Enforced client-side (immediate feedback) AND server-side (defense).
 */
export const RESERVED_FOLDER_SLUGS = new Set([
  "admin",
  "api",
  "login",
  "home",
  "vault",
  "..",
  ".",
  "notes",
  "photos",
  "journal",
]);

export interface VaultFile {
  name: string;
  kind: FileKind;
  content: string; // caption / body text
  url?: string; // Blob URL — photos only
  createdAt?: string;
}

/**
 * A folder's contents, split by kind. Each key maps to the list of files
 * of that kind belonging to the folder.
 */
export interface FolderContents {
  slug: string;
  name: string;
  description: string;
  notes: VaultFile[];
  photos: VaultFile[];
  journal: VaultFile[];
}

/**
 * Root-level data — a list of folders each carrying its contents. Fetched
 * once on the server; the terminal doesn't fetch on its own.
 */
export interface VaultData {
  folders: FolderContents[];
}

/* ----------------------------------------------------------------------------
 * Cwd model
 * ------------------------------------------------------------------------- */

export interface Cwd {
  folder: string | null; // slug, or null at root
  kind: FileKind | null;
}

export const ROOT_CWD: Cwd = { folder: null, kind: null };

/** Human-readable path for the prompt: ~, ~/climbing, ~/climbing/notes */
export function formatPromptPath(cwd: Cwd): string {
  if (!cwd.folder) return "~";
  if (!cwd.kind) return `~/${cwd.folder}`;
  return `~/${cwd.folder}/${cwd.kind}`;
}

/**
 * Resolve a path string (relative to cwd) into a new Cwd.
 * Supported inputs:
 *   ~ / /               → root
 *   ..                  → parent
 *   <folder>            → into a folder (from root)
 *   <kind>              → into a kind (from inside a folder)
 *   <folder>/<kind>     → jump two levels (from root)
 *
 * Returns null if the path is invalid OR doesn't exist in `data`.
 */
export function resolvePath(
  input: string,
  cwd: Cwd,
  data: VaultData,
): Cwd | null {
  const raw = input.trim();
  if (!raw) return cwd;

  // Absolute forms first.
  if (raw === "~" || raw === "/" || raw === "~/") return ROOT_CWD;
  if (raw === "..") {
    if (cwd.kind) return { folder: cwd.folder, kind: null };
    if (cwd.folder) return ROOT_CWD;
    return null;
  }

  // Strip leading ~ or /.
  const normalized = raw.replace(/^~\//, "").replace(/^\//, "");
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length === 0) return ROOT_CWD;

  // Resolution depends on where we are.
  if (cwd.kind) {
    // Inside a kind, only ".." makes sense (handled above). Anything else
    // is an error — the terminal doesn't have sub-kind dirs.
    return null;
  }

  if (cwd.folder) {
    // Inside a folder, accept a single kind.
    if (parts.length === 1 && (KINDS as string[]).includes(parts[0]!)) {
      return { folder: cwd.folder, kind: parts[0] as FileKind };
    }
    return null;
  }

  // At root: accept <folder> or <folder>/<kind>.
  const folderSlug = parts[0]!;
  const folder = data.folders.find((f) => f.slug === folderSlug);
  if (!folder) return null;
  if (parts.length === 1) return { folder: folderSlug, kind: null };
  if (parts.length === 2 && (KINDS as string[]).includes(parts[1]!)) {
    return { folder: folderSlug, kind: parts[1] as FileKind };
  }
  return null;
}

/** Get a folder by slug — null if not found. */
export function getFolder(
  slug: string,
  data: VaultData,
): FolderContents | null {
  return data.folders.find((f) => f.slug === slug) ?? null;
}

/** Get a kind's file list within a folder. */
export function getFilesInKind(
  folder: FolderContents,
  kind: FileKind,
): VaultFile[] {
  return folder[kind];
}
