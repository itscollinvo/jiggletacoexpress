import Link from "next/link";
import { getAllVaultPhotos } from "@/lib/db/queries/vault";

export const dynamic = "force-dynamic";

export default async function VaultPhotosPage() {
  const photos = await getAllVaultPhotos();

  return (
    <div className="px-6 py-12" style={{ maxWidth: "960px", margin: "0 auto" }}>
      {/* Back to terminal */}
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
        photos/
      </h1>

      {photos.length === 0 ? (
        <p
          className="text-xs tracking-widest"
          style={{ color: "rgba(255,255,255,0.2)", fontFamily: "ui-monospace, monospace" }}
        >
          (empty)
        </p>
      ) : (
        <div className="columns-1 gap-6 sm:columns-2 lg:columns-3">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="mb-6 break-inside-avoid"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "2px",
                padding: "8px 8px 24px 8px",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={photo.caption}
                className="w-full block"
                style={{ borderRadius: "1px" }}
              />
              {(photo.takenAt || photo.caption) && (
                <div className="mt-3 px-1">
                  {photo.takenAt && (
                    <p
                      className="text-xs mb-1"
                      style={{ color: "rgba(255,255,255,0.22)", fontFamily: "ui-monospace, monospace" }}
                    >
                      {photo.takenAt}
                    </p>
                  )}
                  {photo.caption && (
                    <p
                      className="text-xs leading-relaxed"
                      style={{ color: "rgba(255,255,255,0.45)" }}
                    >
                      {photo.caption}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
