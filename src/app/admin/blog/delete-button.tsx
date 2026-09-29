"use client";

import { deletePostAction } from "./actions";

interface Props {
  postId: number;
  postTitle: string;
}

export function DeletePostButton({ postId, postTitle }: Props) {
  return (
    <form
      action={deletePostAction}
      onSubmit={(e) => {
        if (
          !window.confirm(`Delete "${postTitle}"? This can't be undone.`)
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={postId} />
      <button
        type="submit"
        className="rounded-xl border border-accent-coral/30 px-3 py-1.5 text-xs text-accent-coral transition-colors hover:bg-accent-coral hover:text-white"
      >
        Delete
      </button>
    </form>
  );
}
