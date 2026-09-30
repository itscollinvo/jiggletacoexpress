"use client";

import { deleteTimelineEntryAction } from "../actions";

interface Props {
  entryId: number;
  entryTitle: string;
}

export function DeleteTimelineButton({ entryId, entryTitle }: Props) {
  return (
    <form
      action={deleteTimelineEntryAction}
      onSubmit={(e) => {
        if (!window.confirm(`Delete "${entryTitle}"?`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={entryId} />
      <button
        type="submit"
        className="rounded-xl border border-accent-coral/30 px-3 py-1.5 text-xs text-accent-coral transition-colors hover:bg-accent-coral hover:text-white"
      >
        Delete
      </button>
    </form>
  );
}
