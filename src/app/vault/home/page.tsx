/**
 * /vault/home — server component. Fetches all folders (as a flat list),
 * assembles them into a tree by parent_id, then attaches files (notes,
 * photos, journal) to each node by folder_id. Hands the whole tree to
 * the terminal in a single VaultData object.
 */

import {
  getAllVaultFolders,
  getAllVaultPhotos,
  getAllVaultNotes,
  getAllVaultJournal,
} from "@/lib/db/queries/vault";
import type { VaultData, FolderNode, VaultFile } from "@/lib/vault/filesystem";
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

  // Build a map id → node for O(1) child attachment.
  const nodesById = new Map<number, FolderNode>();
  for (const f of folders) {
    nodesById.set(f.id, {
      id: f.id,
      parentId: f.parentId,
      slug: f.slug,
      name: f.name,
      description: f.description,
      isPublic: f.isPublic,
      children: [],
      files: [],
    });
  }

  // Link parents/children. Collect root nodes (parentId === null).
  const roots: FolderNode[] = [];
  for (const node of nodesById.values()) {
    if (node.parentId === null) {
      roots.push(node);
    } else {
      const parent = nodesById.get(node.parentId);
      parent?.children.push(node);
    }
  }

  // Attach files to their folder. Skip rows with null folder_id (shouldn't
  // happen post-V.1 backfill but defend anyway).
  for (const p of photos) {
    if (p.folderId == null) continue;
    const node = nodesById.get(p.folderId);
    if (!node) continue;
    const f: VaultFile = {
      name: p.filename,
      kind: "photos",
      content: p.caption,
      url: p.url,
      createdAt: p.takenAt ?? undefined,
      isPublic: p.isPublic,
    };
    node.files.push(f);
  }
  for (const n of notes) {
    if (n.folderId == null) continue;
    const node = nodesById.get(n.folderId);
    if (!node) continue;
    node.files.push({
      name: n.slug,
      kind: "notes",
      content: n.content,
      createdAt: n.displayDate ?? undefined,
      isPublic: n.isPublic,
    });
  }
  for (const j of journal) {
    if (j.folderId == null) continue;
    const node = nodesById.get(j.folderId);
    if (!node) continue;
    node.files.push({
      name: `${j.entryDate}.md`,
      kind: "journal",
      content: j.content,
      createdAt: j.entryDate,
      isPublic: j.isPublic,
    });
  }

  const vaultData: VaultData = { roots };

  return (
    <VaultTerminal
      vaultData={vaultData}
      initiallyAuthed={!!user}
      adminEmail={user?.email ?? null}
    />
  );
}
