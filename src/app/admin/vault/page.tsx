import { getAllVaultPhotos, getAllVaultNotes, getAllVaultJournal } from "@/lib/db/queries/vault";
import { deleteVaultPhotoAction, deleteVaultNoteAction, deleteVaultJournalAction } from "./actions";
import { UploadForm } from "./upload-form";
import { NoteForm } from "./note-form";
import { JournalForm } from "./journal-form";

export const dynamic = "force-dynamic";

export default async function AdminVaultPage() {
  const [photos, notes, journal] = await Promise.all([
    getAllVaultPhotos(),
    getAllVaultNotes(),
    getAllVaultJournal(),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 flex flex-col gap-16">

      {/* ── Photos ────────────────────────────────────────────────────────── */}
      <section>
        <h1 className="mb-8 text-2xl font-bold text-foreground">Vault</h1>

        <h2 className="mb-4 text-base font-semibold text-foreground">Upload photo</h2>
        <UploadForm />

        <h2 className="mt-8 mb-4 text-base font-semibold text-foreground">
          Photos ({photos.length})
        </h2>
        {photos.length === 0 ? (
          <p className="text-sm text-muted">No photos yet.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="flex items-center gap-4 rounded-lg border border-border bg-foreground/5 p-4"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={photo.caption}
                  className="h-16 w-16 rounded object-cover shrink-0"
                />
                <div className="flex min-w-0 flex-col gap-1 flex-1">
                  <span className="font-mono text-sm text-foreground truncate">
                    {photo.filename}
                  </span>
                  {photo.caption && (
                    <span className="text-xs text-muted truncate">{photo.caption}</span>
                  )}
                  {photo.takenAt && (
                    <span className="text-xs text-muted">{photo.takenAt}</span>
                  )}
                </div>
                <form action={deleteVaultPhotoAction}>
                  <input type="hidden" name="id" value={photo.id} />
                  <button
                    type="submit"
                    className="text-xs text-muted hover:text-accent-coral transition-colors"
                  >
                    delete
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Notes ─────────────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-1 text-xl font-bold text-foreground">Notes</h2>
        <p className="mb-6 text-xs text-muted">Short fragments. Appear as files under notes/ in the terminal.</p>

        <h3 className="mb-4 text-base font-semibold text-foreground">Add note</h3>
        <NoteForm />

        <h3 className="mt-8 mb-4 text-base font-semibold text-foreground">
          Notes ({notes.length})
        </h3>
        {notes.length === 0 ? (
          <p className="text-sm text-muted">No notes yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {notes.map((note) => (
              <div
                key={note.id}
                className="rounded-lg border border-border bg-foreground/5 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-col gap-1 flex-1">
                    <span className="font-mono text-sm text-foreground">{note.slug}</span>
                    {note.displayDate && (
                      <span className="text-xs text-muted">{note.displayDate}</span>
                    )}
                    <p className="mt-2 text-sm text-muted whitespace-pre-wrap line-clamp-3">
                      {note.content}
                    </p>
                  </div>
                  <form action={deleteVaultNoteAction} className="shrink-0">
                    <input type="hidden" name="id" value={note.id} />
                    <button
                      type="submit"
                      className="text-xs text-muted hover:text-accent-coral transition-colors"
                    >
                      delete
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Journal ───────────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-1 text-xl font-bold text-foreground">Journal</h2>
        <p className="mb-6 text-xs text-muted">Longer entries. Appear as files under journal/ in the terminal.</p>

        <h3 className="mb-4 text-base font-semibold text-foreground">Add entry</h3>
        <JournalForm />

        <h3 className="mt-8 mb-4 text-base font-semibold text-foreground">
          Entries ({journal.length})
        </h3>
        {journal.length === 0 ? (
          <p className="text-sm text-muted">No entries yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {journal.map((entry) => (
              <div
                key={entry.id}
                className="rounded-lg border border-border bg-foreground/5 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-col gap-1 flex-1">
                    <span className="font-mono text-sm text-foreground">{entry.entryDate}.md</span>
                    <p className="mt-2 text-sm text-muted whitespace-pre-wrap line-clamp-3">
                      {entry.content}
                    </p>
                  </div>
                  <form action={deleteVaultJournalAction} className="shrink-0">
                    <input type="hidden" name="id" value={entry.id} />
                    <button
                      type="submit"
                      className="text-xs text-muted hover:text-accent-coral transition-colors"
                    >
                      delete
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
