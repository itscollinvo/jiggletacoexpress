/**
 * Vault virtual filesystem.
 *
 * Defines the shape the terminal commands (ls, cat, cd, open) operate on.
 * The terminal receives a VaultData object as a prop from the server-rendered
 * page — it never fetches directly. This means you can swap the data source
 * (static → DB → API) without changing any terminal UI code.
 *
 * Photos come from the DB (vault_photos table).
 * Notes and journal entries are static for now; will move to DB later.
 */

export type FileKind = "note" | "photo" | "journal";

export interface VaultFile {
  name: string;
  kind: FileKind;
  content: string;   // caption / body text
  url?: string;      // Vercel Blob URL — photos only
  createdAt?: string;
}

export interface VaultDir {
  files: VaultFile[];
}

export type VaultData = Record<string, VaultDir>;

/** Placeholder static content for notes and journal */
export const STATIC_VAULT_DATA: VaultData = {
  notes: {
    files: [
      {
        name: "scattered-thoughts.md",
        kind: "note",
        content: `still figuring things out.\nthat's okay.`,
        createdAt: "2026-03-12",
      },
    ],
  },
  journal: {
    files: [
      {
        name: "2026-01-15.md",
        kind: "journal",
        content: `started this. not sure where it goes.\nthat's the point.`,
        createdAt: "2026-01-15",
      },
    ],
  },
};

export const DIRS = ["notes", "photos", "journal"];

/** Resolve a path string to a directory name, or null if invalid. */
export function resolvePath(input: string, cwd: string): string | null {
  const normalized = input.replace(/^~\//, "").replace(/^\//, "").trim();
  if (!normalized || normalized === "~" || normalized === "/") return "~";
  if (normalized === "..") return cwd === "~" ? null : "~";
  if (DIRS.includes(normalized)) return normalized;
  return null;
}

/** Format a path for the prompt (e.g. ~/notes or ~) */
export function formatPromptPath(cwd: string): string {
  return cwd === "~" ? "~" : `~/${cwd}`;
}
