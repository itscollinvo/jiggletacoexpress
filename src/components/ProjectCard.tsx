/**
 * Single project card. Server-safe. Renders a rich preview: thumbnail
 * with gradient overlay, tech-stack chips, status badge, and a footer
 * row of icon links (github + demo).
 *
 * Design decisions:
 *   - Aspect-video (16:9) thumbnail so the card grid stays visually
 *     consistent regardless of whether projects have images.
 *   - Gradient overlay on the thumbnail darkens the bottom so title text
 *     sits over pixels rather than fighting them.
 *   - Status badge only rendered for "wip" and "archived" — an "active"
 *     project doesn't need a badge, the absence is the signal.
 *   - HoverLift wraps the whole card for the micro-scale-on-hover we set
 *     up in R.1. Respects prefers-reduced-motion automatically.
 *   - Links (github/demo) are separate <a> elements from the card
 *     wrapper so clicks on them don't also fire the card link. When
 *     R.3 lands and the card itself becomes a <Link href="/projects/[slug]">,
 *     we'll add `stopPropagation` on the inner links.
 */

import Link from "next/link";
import { GithubIcon } from "./BrandIcons";
import { HoverLift } from "./motion/HoverLift";
import type { Project } from "@/lib/db/schema";

/**
 * Status → visual mapping. "active" gets no badge (silence = default
 * state). "wip" is coral to draw attention. "archived" is muted so it
 * doesn't compete with current work.
 */
function StatusBadge({ status }: { status: string }) {
  if (status === "active") return null;
  const label = status === "wip" ? "Work in progress" : "Archived";
  const styles =
    status === "wip"
      ? "bg-accent-coral/15 text-accent-coral"
      : "bg-foreground/10 text-foreground/60";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider ${styles}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === "wip" ? "bg-accent-coral" : "bg-foreground/40"
        }`}
      />
      {label}
    </span>
  );
}

/**
 * External-link icon (arrow-out-of-box). Inline SVG so we don't pull in
 * another icon lib import just for one glyph.
 */
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

export function ProjectCard({ project }: { project: Project }) {
  return (
    <HoverLift className="h-full">
      <article className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-foreground/3 transition-colors hover:border-accent-coral">
        {/* Thumbnail. When no image, show a subtle placeholder so cards
          * don't visually collapse. */}
        <div className="relative aspect-video w-full overflow-hidden bg-foreground/5">
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
          {/* Bottom gradient makes any title/text overlay sit legibly. */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/80 via-background/10 to-transparent" />
          {/* Status badge floats top-right */}
          <div className="absolute top-3 right-3">
            <StatusBadge status={project.status} />
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3 p-5">
          <h3 className="text-lg font-semibold text-foreground transition-colors group-hover:text-accent-hover">
            {project.title}
          </h3>

          <p className="line-clamp-3 flex-1 text-sm leading-6 text-foreground/70">
            {project.description}
          </p>

          {/* Tech stack chips — hidden entirely when empty so the layout
            * stays tight for early projects that haven't been tagged. */}
          {project.techStack.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5">
              {project.techStack.map((tech) => (
                <li
                  key={tech}
                  className="rounded-full bg-foreground/5 px-2.5 py-0.5 text-[11px] text-foreground/70"
                >
                  {tech}
                </li>
              ))}
            </ul>
          ) : null}

          {/* Link row — github + demo. Renders only if at least one exists. */}
          {(project.githubUrl || project.demoUrl) && (
            <div className="mt-2 flex flex-wrap gap-2 border-t border-border pt-3">
              {project.githubUrl && (
                <Link
                  href={project.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-foreground/80 transition-colors hover:border-accent-coral hover:text-accent-hover"
                >
                  <GithubIcon className="h-3.5 w-3.5" />
                  Source
                </Link>
              )}
              {project.demoUrl && (
                <Link
                  href={project.demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-accent-coral/40 bg-accent-coral/10 px-3 py-1 text-xs font-medium text-accent-coral transition-colors hover:bg-accent-coral hover:text-white"
                >
                  <ExternalLinkIcon className="h-3.5 w-3.5" />
                  Live demo
                </Link>
              )}
            </div>
          )}
        </div>
      </article>
    </HoverLift>
  );
}
