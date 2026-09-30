import Link from "next/link";
import { getNow, getTimelineEntries, getAboutPhotos } from "@/lib/db/queries/about";
import { Timeline } from "@/components/about/Timeline";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { FadeIn } from "@/components/motion/FadeIn";
import { StaggerList, StaggerItem } from "@/components/motion/StaggerList";

/**
 * /about — personal introduction page.
 *
 * Content mix:
 *   - HERO / NARRATIVE / VALUES: hardcoded below. Edit these directly
 *     in this file. Changes here need a deploy but that's fine — this
 *     content shifts on a scale of months, not days.
 *   - /now: DB-backed, editable at /admin/about/now (rolling snapshot).
 *   - Timeline: DB-backed, /admin/about/timeline (grows over time).
 *   - Hobbies gallery: DB-backed, /admin/about/photos.
 */

export const dynamic = "force-dynamic";

// -----------------------------------------------------------------------
// EDIT THESE IN SOURCE — hardcoded content that changes rarely.
// I drafted placeholders based on what I know about you (Stevens CS,
// climbing, piano). Rewrite whatever feels off — this is your voice, not
// mine. The three DB-backed sections (Now, Timeline, Photos) get their
// content through /admin/about.
// -----------------------------------------------------------------------

const HERO = {
  eyebrow: "About",
  headline: "I'm Collin.",
  sub: "CS student at Stevens, builder of things that make life a little simpler.",
};

const NARRATIVE_PARAGRAPHS = [
  "I like taking something messy and finding the shape of a solution — usually with code, sometimes with a whiteboard, occasionally with a spreadsheet nobody asked for. Most of what I build starts because I got annoyed at the current way and wanted to see if I could do it better.",
  "Outside of school, I climb (both bouldering and top-rope), I'll play any piano I spot, and I try to be outside as often as the weather lets me. I read more nonfiction than I finish, and I keep starting side projects that end up teaching me more than the class they were supposed to reinforce.",
  "This site is where I put the things I've built and the things I'm thinking about. If any of it lands, drop me a line.",
];

const VALUES = [
  {
    title: "Ship small, ship often",
    body: "A tiny thing in prod beats a perfect thing on a branch. Momentum compounds.",
  },
  {
    title: "Learn in public",
    body: "Explaining what I built — even to nobody in particular — makes me understand it twice.",
  },
  {
    title: "Comfort with 'I don't know yet'",
    body: "The interesting problems are always the ones I have to look up. Not knowing is the start, not the end.",
  },
  {
    title: "Kindness is a technical skill",
    body: "How you treat teammates shows up in the code. Nobody wants to help the person who never shares credit.",
  },
];

// -----------------------------------------------------------------------

export default async function AboutPage() {
  // Parallel fetch — three unrelated tables, no reason to serialize.
  const [nowRow, timeline, photos] = await Promise.all([
    getNow(),
    getTimelineEntries(),
    getAboutPhotos(),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-6 pt-20 pb-24 lg:px-12 lg:pt-16">
      {/* HERO */}
      <FadeIn onScroll={false}>
        <p className="text-sm uppercase tracking-[0.3em] text-accent-gold">
          {HERO.eyebrow}
        </p>
        <h1 className="mt-3 text-5xl font-bold leading-tight text-foreground">
          {HERO.headline}
        </h1>
        <p className="mt-4 text-lg leading-7 text-foreground/70">{HERO.sub}</p>
      </FadeIn>

      {/* /now — hidden if the row hasn't been created yet */}
      {nowRow && nowRow.content.trim().length > 0 ? (
        <FadeIn>
          <section className="mt-14 rounded-3xl border border-border bg-foreground/3 p-6">
            <div className="flex items-baseline justify-between">
              <p className="text-xs uppercase tracking-[0.2em] text-accent-gold">
                Right now
              </p>
              <p className="text-xs text-foreground/50">
                Updated {nowRow.updatedAt.toLocaleDateString()}
              </p>
            </div>
            <div className="mt-3">
              <MarkdownRenderer markdown={nowRow.content} />
            </div>
          </section>
        </FadeIn>
      ) : null}

      {/* NARRATIVE */}
      <FadeIn>
        <section className="mt-16 space-y-5">
          {NARRATIVE_PARAGRAPHS.map((p, i) => (
            <p key={i} className="text-base leading-7 text-foreground/85">
              {p}
            </p>
          ))}
        </section>
      </FadeIn>

      {/* TIMELINE */}
      {timeline.length > 0 ? (
        <FadeIn>
          <section className="mt-20">
            <h2 className="text-2xl font-bold text-foreground">
              How I got here
            </h2>
            <div className="mt-8">
              <Timeline entries={timeline} />
            </div>
          </section>
        </FadeIn>
      ) : null}

      {/* VALUES */}
      <FadeIn>
        <section className="mt-20">
          <h2 className="text-2xl font-bold text-foreground">
            How I think about the work
          </h2>
          <StaggerList className="mt-8 grid gap-4 sm:grid-cols-2">
            {VALUES.map((v) => (
              <StaggerItem key={v.title}>
                <div className="h-full rounded-3xl border border-border p-6 transition-colors hover:border-accent-coral">
                  <h3 className="text-lg font-semibold text-foreground">
                    {v.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-foreground/70">
                    {v.body}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </StaggerList>
        </section>
      </FadeIn>

      {/* HOBBIES GALLERY */}
      {photos.length > 0 ? (
        <FadeIn>
          <section className="mt-20">
            <h2 className="text-2xl font-bold text-foreground">
              Elsewhere
            </h2>
            <p className="mt-2 text-sm text-foreground/60">
              A few things I do when I close my laptop.
            </p>
            <StaggerList className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {photos.map((photo) => (
                <StaggerItem key={photo.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={photo.caption ?? ""}
                    loading="lazy"
                    className="aspect-square w-full rounded-2xl border border-border object-cover"
                  />
                  {photo.caption ? (
                    <p className="mt-2 text-xs text-foreground/60">
                      {photo.caption}
                    </p>
                  ) : null}
                </StaggerItem>
              ))}
            </StaggerList>
          </section>
        </FadeIn>
      ) : null}

      {/* FOOTER — call to action */}
      <FadeIn>
        <section className="mt-24 rounded-3xl border border-border bg-foreground/3 p-8 text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-accent-gold">
            Say hi
          </p>
          <p className="mt-3 text-base text-foreground/80">
            The fastest way to reach me is{" "}
            <a
              href="mailto:collinvo26@gmail.com"
              className="text-accent-coral underline decoration-accent-coral/40 underline-offset-4 hover:text-accent-hover"
            >
              email
            </a>
            . I read everything.
          </p>
          <Link
            href="/projects"
            className="mt-6 inline-block rounded-2xl border border-border px-4 py-2 text-sm text-foreground/80 transition-colors hover:border-accent-coral hover:text-accent-hover"
          >
            See what I&apos;m building →
          </Link>
        </section>
      </FadeIn>
    </div>
  );
}
