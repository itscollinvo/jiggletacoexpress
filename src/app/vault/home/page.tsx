/**
 * /vault/home — server component.
 *
 * Fetches all vault content from the DB (photos, notes, journal), then passes
 * it to the client-side terminal. Static fallback data is kept in filesystem.ts
 * but is no longer used here — all content is now DB-backed.
 */

import { getAllVaultPhotos, getAllVaultNotes, getAllVaultJournal } from "@/lib/db/queries/vault";
import { type VaultData } from "@/lib/vault/filesystem";
import { VaultTerminal } from "@/components/vault/Terminal";

export const dynamic = "force-dynamic";

export default async function VaultHome() {
  const [dbPhotos, dbNotes, dbJournal] = await Promise.all([
    getAllVaultPhotos(),
    getAllVaultNotes(),
    getAllVaultJournal(),
  ]);

  const vaultData: VaultData = {
    photos: {
      files: dbPhotos.map((p) => ({
        name: p.filename,
        kind: "photo" as const,
        content: p.caption,
        url: p.url,
        createdAt: p.takenAt ?? undefined,
      })),
    },
    notes: {
      files: dbNotes.map((n) => ({
        name: n.slug,
        kind: "note" as const,
        content: n.content,
        createdAt: n.displayDate ?? undefined,
      })),
    },
    journal: {
      files: dbJournal.map((e) => ({
        name: `${e.entryDate}.md`,
        kind: "journal" as const,
        content: e.content,
        createdAt: e.entryDate,
      })),
    },
  };

  return <VaultTerminal vaultData={vaultData} />;
}
