"use client";

/**
 * Shared create/edit form for blog posts. Client component because it uses
 * useActionState for field-level errors and a useEffect to auto-generate
 * the slug from the title while creating.
 *
 * Live preview + inline image upload land in Phase B.3.
 */

import { useActionState, useState } from "react";
import Link from "next/link";
import type { ActionResult } from "./actions";
import { slugify } from "@/lib/validation/blog";

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
  /** In create mode, we auto-generate slug from title until user edits it. */
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

export function PostForm({
  action,
  defaults,
  submitLabel,
  autoSlug = false,
}: Props) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const fieldErrors = !state.ok ? state.fieldErrors : undefined;
  const formError = !state.ok ? state.formError : undefined;

  // Slug auto-fills from title until the user edits the slug field, then
  // locks. We derive the displayed slug during render rather than mirroring
  // title -> slug through an effect (React's new lint rule flags cascading
  // setStates in effects; the derived-value pattern is what "you might not
  // need an effect" recommends here).
  const [title, setTitle] = useState(defaults?.title ?? "");
  const [manualSlug, setManualSlug] = useState(defaults?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!autoSlug);
  const slug =
    autoSlug && !slugTouched ? slugify(title) : manualSlug;

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

      {/* Body */}
      <label className="block space-y-2">
        <span className="text-sm font-medium text-foreground">
          Body{" "}
          <span className="text-foreground/50">
            (markdown — GFM, code blocks, images)
          </span>
        </span>
        <textarea
          name="bodyMarkdown"
          rows={20}
          defaultValue={defaults?.bodyMarkdown ?? SUGGESTED_BODY}
          className="w-full rounded-2xl border border-border bg-background px-4 py-3 font-mono text-sm text-foreground outline-none transition-colors focus:border-accent-coral"
        />
        {fieldErrors?.bodyMarkdown ? (
          <span className="text-xs text-accent-coral">
            {fieldErrors.bodyMarkdown}
          </span>
        ) : null}
      </label>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Cover image URL — B.3 makes this a file picker */}
        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">
            Cover image URL{" "}
            <span className="text-foreground/50">(optional)</span>
          </span>
          <input
            type="url"
            name="coverImageUrl"
            defaultValue={defaults?.coverImageUrl ?? ""}
            placeholder="https://..."
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-accent-coral"
          />
          {fieldErrors?.coverImageUrl ? (
            <span className="text-xs text-accent-coral">
              {fieldErrors.coverImageUrl}
            </span>
          ) : null}
        </label>

        {/* Tags */}
        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">
            Tags{" "}
            <span className="text-foreground/50">(comma-separated)</span>
          </span>
          <input
            name="tags"
            defaultValue={(defaults?.tags ?? []).join(", ")}
            placeholder="auth, ui, vault"
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-accent-coral"
          />
          {fieldErrors?.tags ? (
            <span className="text-xs text-accent-coral">{fieldErrors.tags}</span>
          ) : null}
        </label>
      </div>

      {/* Change links */}
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
       * an onClick handler on each button. Default = "draft". */}
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
