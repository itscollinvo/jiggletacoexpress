import Link from "next/link";
import { requireCurrentUser } from "@/lib/auth/auth";
import { getTimelineEntries } from "@/lib/db/queries/about";
import { DeleteTimelineButton } from "./delete-button";

export const dynamic = "force-dynamic";

export default async function AdminTimelinePage() {
  await requireCurrentUser();
  const entries = await getTimelineEntries();

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-6 py-16">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-accent-gold">
            About / Timeline
          </p>
          <h1 className="mt-3 text-3xl font-bold text-foreground">
            Milestones
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-foreground/70">
            Entries render in sort-order. Aim for a handful of meaningful
            beats rather than every minor step.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href="/admin/about/timeline/new"
            className="rounded-2xl bg-accent-coral px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-hover"
          >
            New entry
          </Link>
          <Link
            href="/admin/about"
            className="rounded-2xl border border-border px-4 py-2 text-sm text-foreground/80 transition-colors hover:border-accent-coral hover:text-accent-hover"
          >
            Back
          </Link>
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="mt-16 text-foreground/60">
          No entries yet.{" "}
          <Link
            href="/admin/about/timeline/new"
            className="text-accent-coral hover:text-accent-hover"
          >
            Add your first one →
          </Link>
        </p>
      ) : (
        <ul className="space-y-3">
          {entries.map((e) => (
            <li
              key={e.id}
              className="flex items-start justify-between gap-4 rounded-2xl border border-border p-4"
            >
              <div>
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-xs uppercase tracking-wider text-accent-gold">
                    {e.year}
                  </span>
                  <span className="text-xs text-foreground/40">
                    sort {e.sortOrder}
                  </span>
                </div>
                <p className="mt-1 font-semibold text-foreground">{e.title}</p>
                {e.description ? (
                  <p className="mt-1 text-sm text-foreground/70">
                    {e.description}
                  </p>
                ) : null}
                {e.icon ? (
                  <p className="mt-1 font-mono text-xs text-foreground/40">
                    icon: {e.icon}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-shrink-0 gap-2">
                <Link
                  href={`/admin/about/timeline/${e.id}/edit`}
                  className="rounded-xl border border-border px-3 py-1.5 text-xs text-foreground/80 transition-colors hover:border-accent-coral hover:text-accent-hover"
                >
                  Edit
                </Link>
                <DeleteTimelineButton entryId={e.id} entryTitle={e.title} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
