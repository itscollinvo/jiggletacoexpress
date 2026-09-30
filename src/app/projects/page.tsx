import { ProjectCard } from "@/components/ProjectCard";
import { FeaturedProjectHero } from "@/components/FeaturedProjectHero";
import { getProjectsSplit } from "@/lib/db/queries/projects";
import {
  StaggerList,
  StaggerItem,
} from "@/components/motion/StaggerList";
import { FadeIn } from "@/components/motion/FadeIn";

// See /src/app/page.tsx for why we force dynamic rendering.
export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  // R.2 layout: up to 2 featured projects at the top, everything else in
  // the standard grid below. getProjectsSplit does the partition in one
  // DB round-trip; anything featured beyond 2 spills into `rest`.
  const { featured, rest } = await getProjectsSplit(2);

  return (
    <div className="mx-auto max-w-6xl px-6 pt-20 pb-16 lg:px-12 lg:pt-16">
      <FadeIn onScroll={false}>
        <p className="text-sm uppercase tracking-[0.3em] text-accent-gold">
          Projects
        </p>
        <h1 className="mt-3 text-4xl font-bold text-foreground">
          Things I&apos;m building
        </h1>
        <p className="mt-3 max-w-2xl text-foreground/70">
          Featured work sits up top. Below is everything else — school
          projects, weekend experiments, half-finished ideas I keep coming
          back to.
        </p>
      </FadeIn>

      {/* Featured hero row — 1 col on mobile, 2 cols on lg+ when there
        * are exactly 2 featured. When there's only 1, it takes full width
        * because a single column at max-w-6xl doesn't need to shrink. */}
      {featured.length > 0 ? (
        <StaggerList
          className={`mt-10 grid gap-6 ${
            featured.length >= 2 ? "lg:grid-cols-2" : "grid-cols-1"
          }`}
        >
          {featured.map((p) => (
            <StaggerItem key={p.id}>
              <FeaturedProjectHero project={p} />
            </StaggerItem>
          ))}
        </StaggerList>
      ) : null}

      {/* Rest grid. Skipped section header if there are no featured
        * projects above — the H1 already frames it. */}
      {rest.length > 0 ? (
        <div className="mt-16">
          {featured.length > 0 ? (
            <FadeIn>
              <h2 className="text-lg font-medium uppercase tracking-[0.2em] text-foreground/50">
                Everything else
              </h2>
            </FadeIn>
          ) : null}
          <StaggerList
            className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${
              featured.length > 0 ? "mt-6" : "mt-10"
            }`}
          >
            {rest.map((p) => (
              <StaggerItem key={p.id}>
                <ProjectCard project={p} />
              </StaggerItem>
            ))}
          </StaggerList>
        </div>
      ) : null}

      {featured.length === 0 && rest.length === 0 ? (
        <p className="mt-16 text-foreground/60">
          No projects yet. Come back soon.
        </p>
      ) : null}
    </div>
  );
}
