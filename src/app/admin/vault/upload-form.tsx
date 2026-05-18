"use client";

import { useActionState } from "react";
import { uploadVaultPhotoAction, type VaultActionResult } from "./actions";

export function UploadForm() {
  const [state, action, pending] = useActionState<VaultActionResult | null, FormData>(
    uploadVaultPhotoAction,
    null,
  );

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted">Photo file</label>
        <input
          type="file"
          name="photo"
          accept="image/png,image/jpeg,image/webp,image/gif"
          required
          className="text-sm text-foreground file:mr-3 file:rounded file:border file:border-border file:bg-foreground/5 file:px-3 file:py-1.5 file:text-xs file:text-foreground"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted">Caption</label>
        <input
          type="text"
          name="caption"
          placeholder="the kind of silence that gets inside you."
          className="rounded-md border border-border bg-foreground/5 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent-coral focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted">Date taken (optional)</label>
        <input
          type="text"
          name="takenAt"
          placeholder="nov 2025"
          className="rounded-md border border-border bg-foreground/5 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent-coral focus:outline-none"
        />
      </div>

      {state && !state.ok && (
        <p className="text-xs text-accent-coral">{state.error}</p>
      )}
      {state?.ok && (
        <p className="text-xs text-muted">uploaded.</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md border border-border bg-foreground/5 px-4 py-2 text-sm text-foreground transition-colors hover:border-accent-coral disabled:opacity-50"
      >
        {pending ? "uploading..." : "upload"}
      </button>
    </form>
  );
}
