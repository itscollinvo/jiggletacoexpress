import { getAllVaultPhotos } from "@/lib/db/queries/vault";
import { deleteVaultPhotoAction } from "./actions";
import { UploadForm } from "./upload-form";

export const dynamic = "force-dynamic";

export default async function AdminVaultPage() {
  const photos = await getAllVaultPhotos();

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-8 text-2xl font-bold text-foreground">Vault — Photos</h1>

      <section className="mb-10">
        <h2 className="mb-4 text-base font-semibold text-foreground">Upload photo</h2>
        <UploadForm />
      </section>

      <section>
        <h2 className="mb-4 text-base font-semibold text-foreground">
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
    </div>
  );
}
