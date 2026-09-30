/**
 * Vault virtual filesystem — V.3.
 *
 * Path model is an arbitrary tree, like a real filesystem:
 *   ~                       root, shows top-level folders
 *   ~/climbing              a folder
 *   ~/climbing/2025-summer  nested folder
 *   ~/climbing/beta.md      a file inside a folder
 *
 * Files come in three kinds (note / photo / journal) — each backed by its
 * own DB table (vault_notes / vault_photos / vault_journal). At `ls` time
 * the terminal sees a UNION of all three kinds in the current folder,
 * displayed together like a regular filesystem. Kind is only visible in
 * the file's metadata (icon color, cat rendering) — not as a subdirectory.
 *
 * Special-case legacy: the /general folder still shows the old
 * `notes/ photos/ journal/` sub-dirs for backward compatibility with the
 * pre-V.3 layout. New folders don't get sub-dirs.
 */

export type FileKind = "notes" | "photos" | "journal";

export const KINDS: FileKind[] = ["notes", "photos", "journal"];

/**
 * Slugs that a folder cannot be named. Enforced both client-side (fast
 * feedback) and server-side (source of truth). Also includes the three
 * kind names so a folder can't shadow the legacy /general sub-dirs.
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

/** Legacy folder that still exposes kind sub-dirs. */
export const LEGACY_GENERAL_SLUG = "general";

export interface VaultFile {
  name: string;
  kind: FileKind;
  content: string;
  url?: string;
  createdAt?: string;
  /** false = hidden from guests; shown in red on ls, cat refused. */
  isPublic: boolean;
}

export interface FolderNode {
  id: number;
  parentId: number | null;
  slug: string;
  name: string;
  description: string;
  isPublic: boolean;
  /** Direct child folders. */
  children: FolderNode[];
  /** Files in this folder (union of notes/photos/journal). */
  files: VaultFile[];
}

export interface VaultData {
  /** Every folder in the DB, arranged as a tree rooted at these top-level
   *  folders (parent_id NULL). Each node's files array holds only the files
   *  directly in that folder — not descendants. */
  roots: FolderNode[];
}

/* ----------------------------------------------------------------------------
 * Cwd model
 *
 * Represented as an array of slugs from root. `[]` = root. `["climbing"]` =
 * inside "climbing". `["climbing", "2025"]` = nested.
 *
 * A special "legacy kind sub-dir" is represented by appending a kind slug
 * to a path that ends at the general folder — e.g. ["general", "notes"].
 * The resolvePath helper knows how to walk into and out of these.
 * ------------------------------------------------------------------------- */

export type Cwd = string[];
export const ROOT_CWD: Cwd = [];

/** ~ / ~/a / ~/a/b for the prompt. */
export function formatPromptPath(cwd: Cwd): string {
  if (cwd.length === 0) return "~";
  return `~/${cwd.join("/")}`;
}

/** Walk from root to a target node using an array of slugs. */
export function walkTree(data: VaultData, path: string[]): FolderNode | null {
  if (path.length === 0) return null;
  const [first, ...rest] = path;
  const start = data.roots.find((r) => r.slug === first);
  if (!start) return null;
  let cur: FolderNode | undefined = start;
  for (const slug of rest) {
    cur = cur.children.find((c) => c.slug === slug);
    if (!cur) return null;
  }
  return cur ?? null;
}

/**
 * Is this cwd inside the legacy /general folder's kind sub-dirs?
 * i.e. ["general", "notes"|"photos"|"journal"].
 */
export function isLegacyKindPath(
  cwd: Cwd,
): { folderSlug: string; kind: FileKind } | null {
  if (cwd.length === 2 && cwd[0] === LEGACY_GENERAL_SLUG) {
    const kind = cwd[1] as FileKind;
    if ((KINDS as string[]).includes(kind)) {
      return { folderSlug: cwd[0]!, kind };
    }
  }
  return null;
}

/**
 * Resolve a path string (relative or absolute) to a new Cwd. Returns null
 * if the target doesn't exist. Handles `~`, `/`, `..`, single-name, and
 * multi-segment paths. Legacy kind sub-dirs under /general are also
 * resolvable (e.g. `cd notes` while in ~/general).
 */
export function resolvePath(
  input: string,
  cwd: Cwd,
  data: VaultData,
): Cwd | null {
  const raw = input.trim();
  if (!raw) return cwd;
  if (raw === "~" || raw === "/" || raw === "~/") return ROOT_CWD;

  // Break into parts, keep .. handling
  const parts = raw.replace(/^~\//, "").replace(/^\//, "").split("/").filter(Boolean);

  // Start from cwd (relative) unless the input begins with ~ or / (absolute).
  const start: Cwd = raw.startsWith("~") || raw.startsWith("/") ? [] : [...cwd];

  for (const p of parts) {
    if (p === ".") continue;
    if (p === "..") {
      if (start.length === 0) return null;
      start.pop();
      continue;
    }
    // Legacy support: inside /general (start === ["general"]), accept
    // "notes"/"photos"/"journal" as pseudo-subdirs.
    if (
      start.length === 1 &&
      start[0] === LEGACY_GENERAL_SLUG &&
      (KINDS as string[]).includes(p)
    ) {
      start.push(p);
      continue;
    }
    // Normal case: walk into a child folder.
    const node = walkTree(data, [...start, p]);
    if (!node) return null;
    start.push(p);
  }

  return start;
}

/** Visible slug for display; guests skip hidden folders on regular ls. */
export function folderChildren(node: FolderNode | null, data: VaultData): FolderNode[] {
  return node ? node.children : data.roots;
}

/** Files in a folder — for legacy general-kind sub-dir cwds, filter by kind. */
export function filesInCwd(cwd: Cwd, data: VaultData): VaultFile[] {
  const legacy = isLegacyKindPath(cwd);
  if (legacy) {
    const node = walkTree(data, [legacy.folderSlug]);
    if (!node) return [];
    return node.files.filter((f) => f.kind === legacy.kind);
  }
  if (cwd.length === 0) return [];
  const node = walkTree(data, cwd);
  if (!node) return [];
  return node.files;
}
