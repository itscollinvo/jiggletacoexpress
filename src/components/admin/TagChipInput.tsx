"use client";

/**
 * Tag input rendered as chips. Accepts existing tags via `defaultTags`,
 * emits changes via `onChange`. Also renders a hidden input with the CSV
 * serialization so the server action can keep parsing tags the same way
 * (splitCsv in validation/blog.ts) — no server-side changes needed.
 *
 * Add-tag triggers:
 *   - Enter key
 *   - Comma key (typing "auth," commits "auth")
 *   - Blur (typing "auth" and clicking Save also commits)
 * Remove:
 *   - Click the X on a chip
 *   - Backspace on empty input removes the last chip (common UX pattern)
 *
 * Normalization: lower-cased and trimmed. Duplicates are silently dropped
 * so you can't accidentally add the same tag twice.
 */

import { useState, useRef } from "react";

interface Props {
  name: string;
  defaultTags?: string[];
  placeholder?: string;
  fieldError?: string;
}

export function TagChipInput({
  name,
  defaultTags = [],
  placeholder = "Add a tag and press Enter",
  fieldError,
}: Props) {
  const [tags, setTags] = useState<string[]>(defaultTags);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function commit(raw: string) {
    const normalized = raw.trim().toLowerCase();
    if (!normalized) return;
    if (tags.includes(normalized)) {
      setDraft("");
      return;
    }
    setTags([...tags, normalized]);
    setDraft("");
  }

  function remove(tag: string) {
    setTags(tags.filter((t) => t !== tag));
    inputRef.current?.focus();
  }

  return (
    <div className="space-y-2">
      <div
        className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-background px-3 py-2 focus-within:border-accent-coral"
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent-gold/15 px-3 py-1 text-xs text-accent-gold"
          >
            {tag}
            <button
              type="button"
              onClick={() => remove(tag)}
              className="text-accent-gold/70 transition-colors hover:text-accent-coral"
              aria-label={`Remove ${tag}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commit(draft);
            } else if (e.key === "Backspace" && !draft && tags.length > 0) {
              // Remove last tag on backspace-in-empty-input. Common in most
              // chip inputs (Gmail, Linear, etc.) — feels natural once you
              // notice it.
              setTags(tags.slice(0, -1));
            }
          }}
          onBlur={() => draft && commit(draft)}
          placeholder={tags.length === 0 ? placeholder : ""}
          className="min-w-[8ch] flex-1 bg-transparent text-sm text-foreground outline-none"
        />
      </div>

      {/* Hidden CSV field so the existing server action parser (splitCsv)
       * still works unchanged. Tags come in as "auth, ui, vault" just like
       * the old raw input, then the Zod schema splits and validates. */}
      <input type="hidden" name={name} value={tags.join(", ")} />

      {fieldError ? (
        <span className="text-xs text-accent-coral">{fieldError}</span>
      ) : null}
    </div>
  );
}
