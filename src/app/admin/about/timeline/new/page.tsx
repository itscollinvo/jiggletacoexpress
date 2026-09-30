import Link from "next/link";
import { requireCurrentUser } from "@/lib/auth/auth";
import { TimelineForm } from "../timeline-form";
import { createTimelineEntryAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function NewTimelineEntryPage() {
  await requireCurrentUser();
  return (
    <div className="mx-auto min-h-screen max-w-3xl px-6 py-16">
      <div className="mb-8 space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-accent-gold">
          New timeline entry
        </p>
        <h1 className="text-3xl font-bold text-foreground">Add a milestone</h1>
      </div>
      <div className="rounded-3xl border border-border bg-background/95 p-8">
        <TimelineForm
          action={createTimelineEntryAction}
          submitLabel="Create"
        />
      </div>
      <Link
        href="/admin/about/timeline"
        className="mt-8 inline-block text-sm text-foreground/70 transition-colors hover:text-accent-hover"
      >
        ← Back
      </Link>
    </div>
  );
}
