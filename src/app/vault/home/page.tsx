/**
 * /vault/home — server component.
 *
 * Fetches real photos from the DB, merges with static notes/journal data,
 * then passes everything to the client-side terminal. This is the standard
 * Next.js pattern for combining server data fetching with client interactivity:
 * the server does the I/O, the client handles the UI state.
 */

import { getAllVaultPhotos } from "@/lib/db/queries/vault";
import { STATIC_VAULT_DATA, type VaultData } from "@/lib/vault/filesystem";
import { VaultTerminal } from "@/components/vault/Terminal";

export const dynamic = "force-dynamic";

export default async function VaultHome() {
  const dbPhotos = await getAllVaultPhotos();

  // Build the live VaultData: DB photos + static notes/journal
  const vaultData: VaultData = {
    ...STATIC_VAULT_DATA,
    photos: {
      files: dbPhotos.map((p) => ({
        name: p.filename,
        kind: "photo" as const,
        content: p.caption,
        url: p.url,
        createdAt: p.takenAt ?? undefined,
      })),
    },
  };

  return <VaultTerminal vaultData={vaultData} />;
}
