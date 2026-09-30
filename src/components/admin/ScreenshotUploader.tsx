"use client";

/**
 * Manages a growing list of screenshot URLs for the project form.
 *
 * State model:
 *   - `urls` is the in-order list of screenshot URLs
 *   - Serialized to a hidden CSV input under `name` so the server action's
 *     splitCsv preprocess (in validation/project.ts) parses it into an array
 *
 * Interactions:
 *   - Click "Add screenshot" → file picker → POST to /api/admin/projects/upload
 *     with kind="screenshot" → response URL is appended
 *   - Each thumbnail has an X to remove it from the list
 *   - No reorder yet (drag-and-drop reorder is nice but out of scope; the
 *     append-order today matches insertion order on the case-study page)
 */

import { useState } from "react";

interface Props {
  name: string;
  defaultUrls?: string[];
  fieldError?: string;
}

async function upload(file: File): Promise<{ url: string } | { error: string }> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("kind", "screenshot");
  const res = await fetch("/api/admin/projects/upload", {
    method: "POST",
    body: fd,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    return { error: body?.error ?? `upload failed (${res.status})` };
  }
  return (await res.json()) as { url: string };
}

export function ScreenshotUploader({ name, defaultUrls = [], fieldError }: Props) {
  const [urls, setUrls] = useState<string[]>(defaultUrls);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      // Serial upload — keeps insertion order predictable and avoids
      // hammering the Blob endpoint on multi-select.
      const next = [...urls];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          setError(`Skipped ${file.name} — not an image`);
          continue;
        }
        const result = await upload(file);
        if ("error" in result) {
          setError(result.error);
          continue;
        }
        next.push(result.url);
      }
      setUrls(next);
    } finally {
      setUploading(false);
    }
  }

  function remove(url: string) {
    setUrls(urls.filter((u) => u !== url));
  }

  return (
    <div className="space-y-3">
      {urls.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {urls.map((url) => (
            <li key={url} className="group relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt="Screenshot"
                className="aspect-video w-full rounded-2xl border border-border object-cover"
              />
              <button
                type="button"
                onClick={() => remove(url)}
                aria-label="Remove screenshot"
                className="absolute top-2 right-2 rounded-full bg-background/80 px-2 py-0.5 text-xs text-foreground/80 opacity-0 transition-opacity hover:text-accent-coral group-hover:opacity-100"
              >
                × Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-foreground/50">
          No screenshots yet.
        </p>
      )}

      <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl border border-border px-4 py-2 text-sm text-foreground/80 transition-colors hover:border-accent-coral hover:text-accent-hover">
        {uploading ? "Uploading…" : "Add screenshot"}
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
      </label>

      {/* Hidden CSV field so the existing splitCsv preprocess handles it
       * server-side without any changes to actions.ts. */}
      <input type="hidden" name={name} value={urls.join(",")} />

      {error ? <p className="text-xs text-accent-coral">{error}</p> : null}
      {fieldError ? (
        <p className="text-xs text-accent-coral">{fieldError}</p>
      ) : null}
    </div>
  );
}
