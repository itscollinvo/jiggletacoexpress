"use client";

/**
 * Delete-with-confirmation. Client component because we need the browser's
 * confirm() dialog. The form action is still a server action — the only
 * client logic is "ask first before submitting."
 */

import { deleteProjectAction } from "./actions";

interface Props {
  projectId: number;
  projectTitle: string;
}

export function DeleteProjectButton({ projectId, projectTitle }: Props) {
  return (
    <form
      action={deleteProjectAction}
      onSubmit={(e) => {
        if (
          !window.confirm(`Delete "${projectTitle}"? This can't be undone.`)
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={projectId} />
      <button
        type="submit"
        className="rounded-xl border border-accent-coral/30 px-3 py-1.5 text-xs text-accent-coral transition-colors hover:bg-accent-coral hover:text-white"
      >
        Delete
      </button>
    </form>
  );
}
