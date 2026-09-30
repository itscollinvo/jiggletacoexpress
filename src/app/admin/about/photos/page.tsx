import Link from "next/link";
import { requireCurrentUser } from "@/lib/auth/auth";
import { getAboutPhotos } from "@/lib/db/queries/about";
import { PhotoManager } from "./photo-manager";

export const dynamic = "force-dynamic";

export default async function AdminAboutPhotosPage() {
  await requireCurrentUser();
  const photos = await getAboutPhotos();

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-6 py-16">
      <div className="mb-8 space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-accent-gold">
          About / Photos
        </p>
        <h1 className="text-3xl font-bold text-foreground">
          Hobbies gallery
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-foreground/70">
          Upload photos of things you do outside code. They render as a grid
          at the bottom of /about.
        </p>
      </div>

      <PhotoManager photos={photos} />

      <Link
        href="/admin/about"
        className="mt-8 inline-block text-sm text-foreground/70 transition-colors hover:text-accent-hover"
      >
        ← Back
      </Link>
    </div>
  );
}
