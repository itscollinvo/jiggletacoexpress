import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth/auth";
import { getTimelineEntryById } from "@/lib/db/queries/about";
import { TimelineForm } from "../../timeline-form";
import { updateTimelineEntryAction } from "../../../actions";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditTimelineEntryPage({ params }: PageProps) {
  await requireCurrentUser();
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const entry = await getTimelineEntryById(id);
  if (!entry) notFound();

  const boundAction = updateTimelineEntryAction.bind(null, id);

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-6 py-16">
      <div className="mb-8 space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-accent-gold">
          Edit entry
        </p>
        <h1 className="text-3xl font-bold text-foreground">{entry.title}</h1>
      </div>
      <div className="rounded-3xl border border-border bg-background/95 p-8">
        <TimelineForm
          action={boundAction}
          submitLabel="Save changes"
          defaults={{
            year: entry.year,
            title: entry.title,
            description: entry.description,
            icon: entry.icon,
            sortOrder: entry.sortOrder,
          }}
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
