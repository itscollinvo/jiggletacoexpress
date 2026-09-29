"use client";

/**
 * Shared create/edit form for blog posts.
 *
 * Phase B.3 additions:
 *   - Live markdown preview beside the editor on lg+ screens (stacks on mobile)
 *   - Drag-and-drop image upload into the body textarea
 *   - "Upload" button next to the cover image URL field
 *   - Tag chip input (was CSV)
 *
 * State model:
 *   Title + slug + body + cover URL are all controlled — needed for live
 *   preview, cursor-position image insertion, and syncing cover URL
 *   between the field and the upload button. Tags are managed inside
 *   TagChipInput (which serializes to a hidden CSV input, keeping the
 *   server action untouched).
 */

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import type { ActionResult } from "./actions";
import { slugify } from "@/lib/validation/blog";
import { MarkdownPreview } from "@/components/admin/MarkdownPreview";
import { TagChipInput } from "@/components/admin/TagChipInput";

type FormAction = (
  prev: ActionResult | null,
  formData: FormData,
) => Promise<ActionResult>;

interface Props {
  action: FormAction;
  defaults?: {
    title?: string;
    subtitle?: string | null;
    slug?: string;
    bodyMarkdown?: string;
    coverImageUrl?: string | null;
    changeLinks?: string[];
    tags?: string[];
    status?: "draft" | "published";
  };
  submitLabel: string;
  autoSlug?: boolean;
}

const initialState: ActionResult = { ok: true };

const SUGGESTED_BODY = `## The problem

Why this change existed. What was broken, missing, or worse than it could be.

## The approach

What we built and the tradeoffs behind it. Link decisions to constraints.

## What shipped

Concrete list — routes added, tables changed, UI moved. Link screenshots and PRs above.

## What's next

Followups, known limitations, related work queued.
`;

/**
 * Insert text at the current selection in a textarea, preserving the rest
 * of the value and moving the cursor to the end of the inserted text.
 * Returns the new value + new cursor position so the caller can update
 * state and imperatively restore focus.
 */
function insertAtCursor(
  el: HTMLTextAreaElement,
  insert: string,
): { value: string; nextCursor: number } {
  const start = el.selectionStart;
  const end = el.selectionEnd;
  const before = el.value.slice(0, start);
  const after = el.value.slice(end);
  return {
    value: `${before}${insert}${after}`,
    nextCursor: start + insert.length,
  };
}

async function uploadImage(
  file: File,
  kind: "inline" | "cover",
): Promise<{ url: string } | { error: string }> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("kind", kind);
  const res = await fetch("/api/admin/blog/upload", {
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

export function PostForm({
  action,
  defaults,
  submitLabel,
  autoSlug = false,
}: Props) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const fieldErrors = !state.ok ? state.fieldErrors : undefined;
  const formError = !state.ok ? state.formError : undefined;

  // Slug auto-fills from title until user edits slug, then locks. Derived
  // during render (not via effect) — the React 19 lint rule flags
  // effect-driven state mirroring.
  const [title, setTitle] = useState(defaults?.title ?? "");
  const [manualSlug, setManualSlug] = useState(defaults?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!autoSlug);
  const slug = autoSlug && !slugTouched ? slugify(title) : manualSlug;

  // Body controlled so we can drive the preview and insert-at-cursor.
  const [body, setBody] = useState<string>(
    defaults?.bodyMarkdown ?? (autoSlug ? SUGGESTED_BODY : ""),
  );
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // Cover image URL controlled so the "Upload" button can fill it in.
  const [coverUrl, setCoverUrl] = useState<string>(
    defaults?.coverImageUrl ?? "",
  );

  // Upload UI state — one flag for each surface, so a drag-drop in progress
  // doesn't visually disable the cover-image button.
  const [inlineUploading, setInlineUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [dropError, setDropError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  async function handleFilesDropped(files: FileList | null) {
    if (!files || files.length === 0) return;
    // Support multi-file drops — insert one line per image, in order.
    setInlineUploading(true);
    setDropError(null);
    try {
      const el = bodyRef.current;
      if (!el) return;

      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          setDropError(`Skipped ${file.name} — not an image`);
          continue;
        }
        const result = await uploadImage(file, "inline");
        if ("error" in result) {
          setDropError(result.error);
          continue;
        }
        // Alt text defaults to filename minus extension. Author can edit
        // it after insert.
        const alt = file.name.replace(/\.[^.]+$/, "");
        const md = `\n\n![${alt}](${result.url})\n`;
        const { value, nextCursor } = insertAtCursor(el, md);
        setBody(value);
        // Wait a tick so React commits before we set selection, otherwise
        // the browser restores the pre-update cursor position.
        setTimeout(() => {
          el.focus();
          el.selectionStart = nextCursor;
          el.selectionEnd = nextCursor;
        }, 0);
      }
    } finally {
      setInlineUploading(false);
    }
  }

  async function handleCoverUpload(files: FileList | null) {
    if (!files || !files[0]) return;
    setCoverUploading(true);
    try {
      const result = await uploadImage(files[0], "cover");
      if ("error" in result) {
        setDropError(result.error);
        return;
      }
      setCoverUrl(result.url);
    } finally {
      setCoverUploading(false);
    }
  }

  return (
    <form action={formAction} className="space-y-6">
      {/* Title */}
      <label className="block space-y-2">
        <span className="text-sm font-medium text-foreground">Title</span>
        <input
          name="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-accent-coral"
        />
        {fieldErrors?.title ? (
          <span className="text-xs text-accent-coral">{fieldErrors.title}</span>
        ) : null}
      </label>

      {/* Subtitle */}
      <label className="block space-y-2">
        <span className="text-sm font-medium text-foreground">
          Subtitle{" "}
          <span className="text-foreground/50">
            (optional — one-line hook shown under the title)
          </span>
        </span>
        <input
          name="subtitle"
          defaultValue={defaults?.subtitle ?? ""}
          className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-accent-coral"
        />
        {fieldErrors?.subtitle ? (
          <span className="text-xs text-accent-coral">
            {fieldErrors.subtitle}
          </span>
        ) : null}
      </label>

      {/* Slug */}
      <label className="block space-y-2">
        <span className="text-sm font-medium text-foreground">
          Slug{" "}
          <span className="text-foreground/50">
            (URL — kebab-case, auto-generated from title)
          </span>
        </span>
        <input
          name="slug"
          required
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setManualSlug(e.target.value);
          }}
          className="w-full rounded-2xl border border-border bg-background px-4 py-3 font-mono text-sm text-foreground outline-none transition-colors focus:border-accent-coral"
        />
        {fieldErrors?.slug ? (
          <span className="text-xs text-accent-coral">{fieldErrors.slug}</span>
        ) : null}
      </label>

      {/* Body + live preview side-by-side on lg+ screens, stacked on mobile.
        * Drop zone: dropping an image on the textarea uploads it and inserts
        * markdown at the cursor. The dragActive class draws a coral outline
        * so it's obvious the drop will land in the body. */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">
            Body{" "}
            <span className="text-foreground/50">
              (markdown — drag images in to upload)
            </span>
          </span>
          {inlineUploading ? (
            <span className="text-xs text-accent-gold">Uploading…</span>
          ) : null}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div
            className={`relative rounded-2xl border transition-colors ${
              dragActive
                ? "border-accent-coral ring-2 ring-accent-coral/40"
                : "border-border"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              void handleFilesDropped(e.dataTransfer.files);
            }}
          >
            <textarea
              ref={bodyRef}
              name="bodyMarkdown"
              rows={22}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full resize-y rounded-2xl bg-background px-4 py-3 font-mono text-sm text-foreground outline-none"
            />
          </div>
          <div className="overflow-x-auto rounded-2xl border border-border bg-foreground/3 px-5 py-4">
            <MarkdownPreview markdown={body} />
          </div>
        </div>
        {dropError ? (
          <p className="text-xs text-accent-coral">{dropError}</p>
        ) : null}
        {fieldErrors?.bodyMarkdown ? (
          <span className="text-xs text-accent-coral">
            {fieldErrors.bodyMarkdown}
          </span>
        ) : null}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Cover image URL + upload button */}
        <div className="space-y-2">
          <span className="text-sm font-medium text-foreground">
            Cover image{" "}
            <span className="text-foreground/50">(optional)</span>
          </span>
          <div className="flex flex-wrap gap-2">
            <input
              type="url"
              name="coverImageUrl"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              placeholder="https://..."
              className="min-w-0 flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-accent-coral"
            />
            <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl border border-border px-4 py-3 text-sm text-foreground/80 transition-colors hover:border-accent-coral hover:text-accent-hover">
              {coverUploading ? "Uploading…" : "Upload"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void handleCoverUpload(e.target.files)}
              />
            </label>
          </div>
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverUrl}
              alt="Cover preview"
              className="mt-2 h-32 w-full rounded-2xl border border-border object-cover"
            />
          ) : null}
          {fieldErrors?.coverImageUrl ? (
            <span className="text-xs text-accent-coral">
              {fieldErrors.coverImageUrl}
            </span>
          ) : null}
        </div>

        {/* Tags — chip input, serializes to CSV under the hood */}
        <div className="space-y-2">
          <span className="text-sm font-medium text-foreground">Tags</span>
          <TagChipInput
            name="tags"
            defaultTags={defaults?.tags ?? []}
            fieldError={fieldErrors?.tags}
          />
        </div>
      </div>

      {/* Change links — kept as CSV. URLs are long and rare enough that a
        * dedicated chip UI would waste vertical space. */}
      <label className="block space-y-2">
        <span className="text-sm font-medium text-foreground">
          Change links{" "}
          <span className="text-foreground/50">
            (comma-separated PR/commit URLs)
          </span>
        </span>
        <input
          name="changeLinks"
          defaultValue={(defaults?.changeLinks ?? []).join(", ")}
          placeholder="https://github.com/itscollinvo/jiggletacoexpress/pull/12"
          className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-accent-coral"
        />
        {fieldErrors?.changeLinks ? (
          <span className="text-xs text-accent-coral">
            {fieldErrors.changeLinks}
          </span>
        ) : null}
      </label>

      {formError ? (
        <p className="rounded-2xl border border-accent-coral/30 bg-accent-coral/10 px-4 py-3 text-sm text-accent-coral">
          {formError}
        </p>
      ) : null}

      {/* Status chosen via which button was pressed. Hidden input is set by
       * onClick handlers on each button. Default = "draft". */}
      <input
        type="hidden"
        name="status"
        defaultValue={defaults?.status ?? "draft"}
        id="status-input"
      />

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          onClick={() => {
            const el = document.getElementById(
              "status-input",
            ) as HTMLInputElement | null;
            if (el) el.value = "draft";
          }}
          className="rounded-2xl border border-border px-4 py-3 text-sm text-foreground/80 transition-colors hover:border-accent-coral hover:text-accent-hover disabled:opacity-50"
        >
          {isPending ? "Saving…" : `${submitLabel} as draft`}
        </button>
        <button
          type="submit"
          disabled={isPending}
          onClick={() => {
            const el = document.getElementById(
              "status-input",
            ) as HTMLInputElement | null;
            if (el) el.value = "published";
          }}
          className="rounded-2xl bg-accent-coral px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-50"
        >
          {isPending ? "Publishing…" : "Publish"}
        </button>
        <Link
          href="/admin/blog"
          className="rounded-2xl border border-border px-4 py-3 text-sm text-foreground/80 transition-colors hover:border-accent-coral hover:text-accent-hover"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
