/**
 * /vault/home — server component. Fetches folders and their contents,
 * assembles the V.2 VaultData shape, and hands it to the terminal.
 *
 * Bulk-fetches all rows once and partitions in JS — trivial for our data
 * size (single-digit folders, dozens of items per folder). If it ever
 * grows, replace with per-folder joins.
 *
 * Also passes the admin session state so the terminal knows whether to
 * unlock write commands on mount. The client can transition into an
 * authed state later via `admin login`.
 */

import {
  getAllVaultFolders,
  getAllVaultPhotos,
  getAllVaultNotes,
  getAllVaultJournal,
} from "@/lib/db/queries/vault";
import type { VaultData, FolderContents } from "@/lib/vault/filesystem";
import { VaultTerminal } from "@/components/vault/Terminal";
import { getCurrentUser } from "@/lib/auth/auth";

export const dynamic = "force-dynamic";

export default async function VaultHome() {
  const [folders, photos, notes, journal, user] = await Promise.all([
    getAllVaultFolders(),
    getAllVaultPhotos(),
    getAllVaultNotes(),
    getAllVaultJournal(),
    getCurrentUser(),
  ]);

  // Partition per folder. Rows with a null folder_id shouldn't exist after
  // V.1 backfill, but we defensively filter to avoid crashes if the DB
  // gets into a weird state.
  const folderContents: FolderContents[] = folders.map((f) => ({
    slug: f.slug,
    name: f.name,
    description: f.description,
    notes: notes
      .filter((n) => n.folderId === f.id)
      .map((n) => ({
        name: n.slug,
        kind: "notes" as const,
        content: n.content,
        createdAt: n.displayDate ?? undefined,
      })),
    photos: photos
      .filter((p) => p.folderId === f.id)
      .map((p) => ({
        name: p.filename,
        kind: "photos" as const,
        content: p.caption,
        url: p.url,
        createdAt: p.takenAt ?? undefined,
      })),
    journal: journal
      .filter((j) => j.folderId === f.id)
      .map((j) => ({
        name: `${j.entryDate}.md`,
        kind: "journal" as const,
        content: j.content,
        createdAt: j.entryDate,
      })),
  }));

  const vaultData: VaultData = { folders: folderContents };

  return (
    <VaultTerminal
      vaultData={vaultData}
      initiallyAuthed={!!user}
      adminEmail={user?.email ?? null}
    />
  );
}
