import Link from "next/link";
import { getAllVaultJournal } from "@/lib/db/queries/vault";

export const dynamic = "force-dynamic";

export default async function VaultJournalPage() {
  const entries = await getAllVaultJournal();

  return (
    <div className="px-6 py-12" style={{ maxWidth: "640px", margin: "0 auto" }}>
      <Link
        href="/vault/home"
        className="mb-8 inline-flex items-center gap-2 text-xs"
        style={{ color: "rgba(255,255,255,0.3)", fontFamily: "ui-monospace, monospace", letterSpacing: "0.1em" }}
      >
        ← cd ..
      </Link>

      <h1
        className="mb-10 text-xs tracking-[0.3em] uppercase"
        style={{ color: "rgba(255,255,255,0.3)", fontFamily: "ui-monospace, monospace" }}
      >
        journal/
      </h1>

      {entries.length === 0 ? (
        <p className="text-xs tracking-widest" style={{ color: "rgba(255,255,255,0.2)", fontFamily: "ui-monospace, monospace" }}>
          (empty)
        </p>
      ) : (
        <div className="flex flex-col gap-10">
          {entries.map((entry) => (
            <article key={entry.id}>
              <p className="mb-3 text-xs" style={{ color: "rgba(255,255,255,0.22)", fontFamily: "ui-monospace, monospace" }}>
                {entry.entryDate}
              </p>
              <p className="text-sm leading-loose whitespace-pre-wrap" style={{ color: "rgba(255,255,255,0.6)" }}>
                {entry.content}
              </p>
              <p className="mt-4 text-xs" style={{ color: "rgba(255,255,255,0.15)", fontFamily: "ui-monospace, monospace" }}>
                {entry.entryDate}.md
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
