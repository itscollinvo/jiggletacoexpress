/**
 * Featured project hero card. Larger and more editorial than
 * ProjectCard — meant for the top of /projects where flagship work
 * gets first-class real estate.
 *
 * Layout:
 *   Two-column on lg+ (image left, content right at 5:4 rough weighting),
 *   stacked on smaller viewports. The parent decides how many to render
 *   in a row — /projects passes up to 2 side-by-side per the R.2 spec.
 *
 * Compared to the standard ProjectCard:
 *   - Bigger typography (title feels like a section header, not a card)
 *   - Description isn't clamped — the hero gets breathing room
 *   - Image is 4:3 rather than 16:9 for a slightly denser presence
 *   - "Featured" pill sits above the title so the reason it's here is
 *     obvious even at a glance
 */

import Link from "next/link";
import { GithubIcon } from "./BrandIcons";
import { HoverLift } from "./motion/HoverLift";
import { TiltCard } from "./motion/TiltCard";
import { getEffectiveSlug } from "@/lib/util/project-slug";
import type { Project } from "@/lib/db/schema";

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

export function FeaturedProjectHero({ project }: { project: Project }) {
  const slug = getEffectiveSlug(project);
  return (
    <TiltCard className="h-full" maxTilt={2.5}>
    <HoverLift scale={1.008} className="h-full">
      <article className="group relative grid h-full grid-cols-1 gap-0 overflow-hidden rounded-3xl border border-border bg-foreground/3 transition-colors hover:border-accent-coral lg:grid-cols-5">
        {/* Full-card overlay link — see ProjectCard for the linked-card
          * pattern comment. Source/Live demo anchors below get z-20. */}
        <Link
          href={`/projects/${slug}`}
          aria-label={project.title}
          className="absolute inset-0 z-10 rounded-3xl focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-coral focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        />
        {/* Image column — takes 2/5 of the horizontal space on lg+ */}
        <div className="relative aspect-video overflow-hidden bg-foreground/5 lg:col-span-2 lg:aspect-auto">
          {project.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={project.imageUrl}
              alt={project.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-widest text-foreground/30">
              No thumbnail
            </div>
          )}
        </div>

        {/* Content column — takes 3/5 on lg+ */}
        <div className="flex flex-col gap-4 p-6 lg:col-span-3 lg:p-8">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-gold/15 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-accent-gold">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-gold" />
              Featured
            </span>
            {project.status === "wip" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-coral/15 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-accent-coral">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-coral" />
                Work in progress
              </span>
            ) : null}
          </div>

          <h2 className="text-2xl font-bold text-foreground transition-colors group-hover:text-accent-hover lg:text-3xl">
            {project.title}
          </h2>

          <p className="text-sm leading-7 text-foreground/75">
            {project.description}
          </p>

          {project.techStack.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5">
              {project.techStack.map((tech) => (
                <li
                  key={tech}
                  className="rounded-full bg-foreground/5 px-3 py-1 text-xs text-foreground/70"
                >
                  {tech}
                </li>
              ))}
            </ul>
          ) : null}

          {(project.githubUrl || project.demoUrl) && (
            <div className="relative z-20 mt-auto flex flex-wrap gap-2 pt-2">
              {project.githubUrl && (
                <Link
                  href={project.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-2xl border border-border px-4 py-2 text-sm text-foreground/80 transition-colors hover:border-accent-coral hover:text-accent-hover"
                >
                  <GithubIcon className="h-4 w-4" />
                  Source
                </Link>
              )}
              {project.demoUrl && (
                <Link
                  href={project.demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-2xl bg-accent-coral px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-hover"
                >
                  <ExternalLinkIcon className="h-4 w-4" />
                  Live demo
                </Link>
              )}
            </div>
          )}
        </div>
      </article>
    </HoverLift>
    </TiltCard>
  );
}
