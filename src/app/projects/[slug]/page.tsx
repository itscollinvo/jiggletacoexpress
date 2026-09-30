import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProjectBySlug } from "@/lib/db/queries/projects";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { GithubIcon } from "@/components/BrandIcons";
import { FadeIn } from "@/components/motion/FadeIn";

/**
 * Per-project case-study page.
 *
 * Layout order:
 *   Back link → Header (status pills, title, description, tech chips) →
 *   Cover image → Long-form markdown body → Screenshots grid → Link
 *   footer (github + demo)
 *
 * Empty-state graceful degradation: any of body / screenshots / cover /
 * demo can be missing without breaking the layout — each renders `null`
 * when absent.
 */

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

/**
 * Per-project OG metadata so pasted links look nice in
 * Twitter/iMessage/Slack. Cover image (imageUrl) is used as the OG image;
 * long-form body isn't included — the description field is short enough.
 */
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) return { title: "Not found" };
  return {
    title: `${project.title} — jiggletaco`,
    description: project.description,
    openGraph: {
      title: project.title,
      description: project.description,
      images: project.imageUrl ? [project.imageUrl] : undefined,
      type: "article",
    },
  };
}

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

export default async function ProjectDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  return (
    <article className="mx-auto max-w-3xl px-6 pt-20 pb-16 lg:px-12 lg:pt-16">
      <Link
        href="/projects"
        className="text-sm text-foreground/60 transition-colors hover:text-accent-hover"
      >
        ← All projects
      </Link>

      <FadeIn onScroll={false}>
        <header className="mt-8 space-y-4">
          {/* Status pills — same visual language as the card badges */}
          <div className="flex flex-wrap items-center gap-2">
            {project.featured ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-gold/15 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-accent-gold">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-gold" />
                Featured
              </span>
            ) : null}
            {project.status === "wip" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-coral/15 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-accent-coral">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-coral" />
                Work in progress
              </span>
            ) : null}
            {project.status === "archived" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-foreground/60">
                <span className="h-1.5 w-1.5 rounded-full bg-foreground/40" />
                Archived
              </span>
            ) : null}
          </div>

          <h1 className="text-4xl font-bold leading-tight text-foreground">
            {project.title}
          </h1>

          <p className="text-lg leading-7 text-foreground/70">
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

          {/* Top action row so links are reachable without scrolling to
            * the bottom. Same buttons appear again in the footer for
            * long case studies. */}
          {(project.githubUrl || project.demoUrl) && (
            <div className="flex flex-wrap gap-2 pt-2">
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
        </header>
      </FadeIn>

      {/* Cover image */}
      {project.imageUrl ? (
        <FadeIn>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={project.imageUrl}
            alt=""
            className="mt-10 w-full rounded-3xl border border-border"
          />
        </FadeIn>
      ) : null}

      {/* Long-form body — hidden entirely if empty so we don't leave a
        * strange gap. When missing, the screenshots + link footer still
        * appear below the header. */}
      {project.longMarkdown && project.longMarkdown.trim().length > 0 ? (
        <FadeIn>
          <div className="mt-10">
            <MarkdownRenderer markdown={project.longMarkdown} />
          </div>
        </FadeIn>
      ) : null}

      {/* Screenshot grid — click any thumbnail opens the full-size image
        * in a new tab. No lightbox in R.3 (simple grid was the picked
        * option). */}
      {project.screenshots.length > 0 ? (
        <FadeIn>
          <section className="mt-14">
            <h2 className="text-lg font-medium uppercase tracking-[0.2em] text-foreground/50">
              Screenshots
            </h2>
            <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {project.screenshots.map((url) => (
                <li key={url}>
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt=""
                      loading="lazy"
                      className="aspect-video w-full rounded-2xl border border-border object-cover transition-transform duration-500 hover:scale-[1.02]"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </FadeIn>
      ) : null}

      {/* Bottom link footer — mirrors the header row, useful after a
        * long body so the CTAs are always within reach. */}
      {(project.githubUrl || project.demoUrl) && (
        <footer className="mt-16 rounded-3xl border border-border bg-foreground/3 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-accent-gold">
            Links
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
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
        </footer>
      )}
    </article>
  );
}
