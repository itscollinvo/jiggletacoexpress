import Link from "next/link";
import { getAllVaultNotes } from "@/lib/db/queries/vault";

export const dynamic = "force-dynamic";

export default async function VaultNotesPage() {
  const notes = await getAllVaultNotes();

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
        notes/
      </h1>

      {notes.length === 0 ? (
        <p className="text-xs tracking-widest" style={{ color: "rgba(255,255,255,0.2)", fontFamily: "ui-monospace, monospace" }}>
          (empty)
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {notes.map((note) => (
            <div
              key={note.id}
              style={{
                borderLeft: "2px solid rgba(255,255,255,0.08)",
                paddingLeft: "1.25rem",
              }}
            >
              {note.displayDate && (
                <p className="mb-2 text-xs" style={{ color: "rgba(255,255,255,0.22)", fontFamily: "ui-monospace, monospace" }}>
                  {note.displayDate}
                </p>
              )}
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "rgba(255,255,255,0.6)" }}>
                {note.content}
              </p>
              <p className="mt-3 text-xs" style={{ color: "rgba(255,255,255,0.18)", fontFamily: "ui-monospace, monospace" }}>
                {note.slug}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
