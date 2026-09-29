"use client";

/**
 * Publish/unpublish toggle rendered inline on each row of /admin/blog.
 *
 * Submits togglePublishAction (server action) via a form — same pattern as
 * DeletePostButton. Server action handles the DB flip AND stamps
 * published_at on the first flip to published (preserving the original
 * publish date across future unpublish/republish cycles). We rely on
 * revalidatePath in the action to refresh this list after the mutation.
 *
 * No optimistic UI on purpose — the roundtrip is fast enough on Vercel
 * that flicker-free "server is source of truth" wins over a subtle
 * consistency bug (e.g. flipping twice quickly).
 */

import { togglePublishAction } from "./actions";

interface Props {
  postId: number;
  isPublished: boolean;
}

export function PublishToggleButton({ postId, isPublished }: Props) {
  return (
    <form action={togglePublishAction}>
      <input type="hidden" name="id" value={postId} />
      <button
        type="submit"
        className={
          isPublished
            ? "rounded-xl border border-border px-3 py-1.5 text-xs text-foreground/70 transition-colors hover:border-accent-gold hover:text-accent-gold"
            : "rounded-xl border border-accent-gold/40 bg-accent-gold/10 px-3 py-1.5 text-xs font-medium text-accent-gold transition-colors hover:bg-accent-gold hover:text-white"
        }
      >
        {isPublished ? "Unpublish" : "Publish"}
      </button>
    </form>
  );
}
