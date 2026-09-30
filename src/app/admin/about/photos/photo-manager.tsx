"use client";

/**
 * Client component that handles both photo upload AND deletion. Combined
 * into one component because the parent server page needs to keep
 * everything on a single form-driven surface without extra client boundaries.
 *
 * Upload flow: file picker → POST /api/admin/about/upload → get URL back
 * → POST to createAboutPhotoAction server action with the URL + caption.
 * Two-step because the upload endpoint returns the persistent Blob URL,
 * which the server action then persists to Postgres.
 */

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  createAboutPhotoAction,
  deleteAboutPhotoAction,
} from "../actions";

interface Photo {
  id: number;
  url: string;
  caption: string | null;
  sortOrder: number;
}

interface Props {
  photos: Photo[];
}

async function uploadToBlobEndpoint(
  file: File,
): Promise<{ url: string } | { error: string }> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/admin/about/upload", {
    method: "POST",
    body: fd,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      error?: string;
    } | null;
    return { error: body?.error ?? `upload failed (${res.status})` };
  }
  return (await res.json()) as { url: string };
}

function DeletePhotoButton({ id }: { id: number }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (!window.confirm("Delete this photo? This can't be undone.")) {
          e.preventDefault();
        }
      }}
      className="absolute top-2 right-2 rounded-full bg-background/85 px-2 py-0.5 text-xs text-foreground/80 transition-colors hover:text-accent-coral"
    >
      × Delete
    </button>
  );
}

export function PhotoManager({ photos }: Props) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const captionRef = useRef<HTMLInputElement>(null);
  const sortRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      if (!file.type.startsWith("image/")) {
        setUploadError("Please pick an image file");
        return;
      }
      const uploaded = await uploadToBlobEndpoint(file);
      if ("error" in uploaded) {
        setUploadError(uploaded.error);
        return;
      }
      // Now persist to DB via server action. Build a FormData directly
      // so we can attach the URL + caption + sortOrder from the inline
      // caption/sort inputs.
      const fd = new FormData();
      fd.append("url", uploaded.url);
      fd.append("caption", captionRef.current?.value ?? "");
      fd.append("sortOrder", sortRef.current?.value ?? "0");
      const result = await createAboutPhotoAction(null, fd);
      if (!result.ok) {
        setUploadError(result.formError ?? "Failed to save photo");
        return;
      }
      // Reset inputs on success — server revalidation will re-render
      // this page with the new photo included in `photos`.
      if (fileRef.current) fileRef.current.value = "";
      if (captionRef.current) captionRef.current.value = "";
      if (sortRef.current) sortRef.current.value = "0";
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-border bg-background/95 p-6">
        <h2 className="text-lg font-semibold text-foreground">Upload a photo</h2>
        <p className="mt-1 text-sm text-foreground/70">
          Image files only, 8MB cap. Caption is optional but nice for context.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="block space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-foreground">Caption</span>
            <input
              ref={captionRef}
              type="text"
              placeholder="Bouldering at the gym, Jan 2026"
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-accent-coral"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground">Sort</span>
            <input
              ref={sortRef}
              type="number"
              defaultValue={0}
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-accent-coral"
            />
          </label>
        </div>
        <label className="mt-3 inline-flex cursor-pointer items-center justify-center rounded-2xl bg-accent-coral px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-50">
          {uploading ? "Uploading…" : "Pick file + upload"}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleUpload(file);
            }}
          />
        </label>
        {uploadError ? (
          <p className="mt-3 text-sm text-accent-coral">{uploadError}</p>
        ) : null}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">
          Existing photos
        </h2>
        {photos.length === 0 ? (
          <p className="mt-3 text-sm text-foreground/60">No photos yet.</p>
        ) : (
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {photos.map((p) => (
              <li key={p.id} className="group relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.url}
                  alt={p.caption ?? ""}
                  className="aspect-square w-full rounded-2xl border border-border object-cover"
                />
                {p.caption ? (
                  <p className="mt-2 text-xs text-foreground/70">
                    {p.caption}
                  </p>
                ) : null}
                <form action={deleteAboutPhotoAction}>
                  <input type="hidden" name="id" value={p.id} />
                  <DeletePhotoButton id={p.id} />
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
