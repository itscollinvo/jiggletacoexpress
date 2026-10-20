import Link from "next/link";
import { Mail } from "lucide-react";
import { GithubIcon, LinkedinIcon } from "@/components/BrandIcons";
import { NowPlaying } from "@/components/NowPlaying";
import { ProjectCard } from "@/components/ProjectCard";
import { getFeaturedProjects } from "@/lib/db/queries/projects";
import { getPublishedPosts } from "@/lib/db/queries/blog";
import { FadeIn } from "@/components/motion/FadeIn";
import { StaggerItem, StaggerList } from "@/components/motion/StaggerList";
import { AnimatedHeadline } from "@/components/hero/AnimatedHeadline";
import { Magnetic } from "@/components/hero/Magnetic";
import { Spotlight } from "@/components/hero/Spotlight";
import { ClimbingWall } from "@/components/wall/ClimbingWall";

// Bolts on the climbing wall, bottom to top. Sections that aren't on the
// page (e.g. "Recently shipped" with no posts) are skipped automatically.
const WALL_SECTIONS = [
  { id: "intro", label: "Intro" },
  { id: "about", label: "About" },
  { id: "shipped", label: "Recently shipped" },
  { id: "projects", label: "Projects" },
];
import { Parallax } from "@/components/motion/Parallax";
import { NowPlayingProvider } from "@/components/now-playing/NowPlayingProvider";
import { AlbumTheme } from "@/components/now-playing/AlbumTheme";
import { HeroBlob } from "@/components/blob/HeroBlob";

const homeDateFmt = new Intl.DateTimeFormat(undefined, {
  month: "long",
  day: "numeric",
  year: "numeric",
});

// Render this page at request time (not build time). Without this, `next build`
// would try to pre-render the page into static HTML and fail in CI because the
// build environment has no DATABASE_URL. In production on Vercel the page is
// still fast (server functions are warm and cached at the edge by default).
export const dynamic = "force-dynamic";

// `async` is allowed on Server Components — the function runs on the server,
// awaits any data, and the result is rendered into the HTML before reaching
// the browser. No useEffect, no loading states, no hydration data fetching.
export default async function Home() {
  // Parallel fetch — projects and posts hit different tables, no reason to
  // serialize them. Promise.all shaves ~1 round-trip off cold requests.
  const [projects, publishedPosts] = await Promise.all([
    getFeaturedProjects(),
    getPublishedPosts(),
  ]);
  const latestPost = publishedPosts[0] ?? null;

  return (
    // NowPlayingProvider polls Spotify once for everything on this page that
    // cares about the current song: the widget and the accent colors.
    <NowPlayingProvider>
    <AlbumTheme />
    <ClimbingWall sections={WALL_SECTIONS} />
    {/* lg:pl-28 leaves room for the climbing wall next to the sidebar. */}
    <div className="mx-auto max-w-3xl px-6 pt-20 pb-16 lg:pt-16 lg:pr-12 lg:pl-28">
      {/* Hero. The headline animates itself (CSS, see AnimatedHeadline);
        * the Now Playing row fades in just after the words land. */}
      <section id="intro" className="flex flex-col gap-6 scroll-mt-16">
        {/* Headline + blob. Side by side from `sm` up (blob on the right),
          * stacked on phones with the blob under the headline. The blob's
          * box has a fixed aspect ratio so the page never jumps when the
          * 3D swaps in for the placeholder. */}
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
          <AnimatedHeadline className="text-4xl font-bold tracking-tight text-foreground sm:flex-1 sm:text-5xl" />
          <HeroBlob className="aspect-square w-48 shrink-0 sm:w-56 lg:w-64" />
        </div>

        {/* CSS fade (not FadeIn): above-the-fold content must be visible
          * without waiting for JavaScript. See .fade-up in globals.css. */}
        <div className="fade-up" style={{ animationDelay: "0.45s" }}>
          <Parallax strength={20}>
            <NowPlaying />
          </Parallax>
          <p className="mt-6 text-lg text-foreground/80">Welcome to my domain.</p>
        </div>
      </section>

      {/* Professional intro. Often on screen at load (phones especially),
        * so it uses the CSS fade like the hero. Sections further down fade
        * up as they scroll into view (FadeIn). The ids are anchors for the
        * climbing-wall nav. */}
      <section
        id="about"
        className="fade-up mt-12 flex flex-col gap-4 scroll-mt-16"
        style={{ animationDelay: "0.55s" }}
      >
        <p className="text-base leading-relaxed text-foreground/90">
          I am currently a CS student at{" "}
          <span className="text-accent-gold">
            Stevens Institute of Technology
          </span>{" "}
          and a soon-to-be Software Engineer, passionate about building
          full-stack applications, machine learning, and engineering personal
          solutions.
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          <Magnetic>
            <Link
              href="https://linkedin.com/in/collinvo"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm transition-colors hover:border-accent-coral hover:text-accent-hover"
            >
              <LinkedinIcon className="h-4 w-4" />
              LinkedIn
            </Link>
          </Magnetic>
          <Magnetic>
            <Link
              href="mailto:collinvo26@gmail.com"
              className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm transition-colors hover:border-accent-coral hover:text-accent-hover"
            >
              <Mail className="h-4 w-4" />
              Email
            </Link>
          </Magnetic>
          <Magnetic>
            <Link
              href="https://github.com/itscollinvo"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm transition-colors hover:border-accent-coral hover:text-accent-hover"
            >
              <GithubIcon className="h-4 w-4" />
              GitHub
            </Link>
          </Magnetic>
        </div>
      </section>

      {/* Casual about */}
      <FadeIn>
      <section className="mt-12">
        <p className="text-base leading-relaxed text-foreground/80">
          All else: let&apos;s keep this brief and casual. I guess this is where
          I tell you a bit about myself. Well, I like to climb cool rocks (feel
          free to reach out to climb), I will definitely try out every piano I
          spot, and I enjoy nature.
        </p>
      </section>
      </FadeIn>

      {/* Latest blog post teaser — hidden entirely when no posts are
        * published yet, so the section doesn't leave an empty gap in the
        * layout. `latestPost` comes from getPublishedPosts()[0] which is
        * already sorted by publishedAt DESC. */}
      {latestPost ? (
        <FadeIn>
        <section id="shipped" className="mt-16 scroll-mt-16">
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl font-bold text-foreground">
              Recently shipped
            </h2>
            <Link
              href="/blog"
              className="text-sm text-foreground/60 transition-colors hover:text-accent-hover"
            >
              all posts →
            </Link>
          </div>
          <Spotlight className="mt-6 rounded-3xl">
          <Link
            href={`/blog/${latestPost.slug}`}
            className="group relative block overflow-hidden rounded-3xl border border-border p-6 transition-colors hover:border-accent-coral hover:bg-foreground/3"
          >
            <div className="spotlight" aria-hidden />
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h3 className="text-lg font-semibold text-foreground transition-colors group-hover:text-accent-hover">
                {latestPost.title}
              </h3>
              {latestPost.publishedAt ? (
                <time
                  dateTime={latestPost.publishedAt.toISOString()}
                  className="text-xs uppercase tracking-[0.2em] text-foreground/50"
                >
                  {homeDateFmt.format(latestPost.publishedAt)}
                </time>
              ) : null}
            </div>
            {latestPost.subtitle ? (
              <p className="mt-3 leading-6 text-foreground/70">
                {latestPost.subtitle}
              </p>
            ) : null}
          </Link>
          </Spotlight>
        </section>
        </FadeIn>
      ) : null}

      {/* Project showcase */}
      <section id="projects" className="mt-16 scroll-mt-16">
        <FadeIn>
          <h2 className="mb-6 text-2xl font-bold text-foreground">Projects</h2>
        </FadeIn>
        {/* Cards rise in one after another as the grid scrolls into view. */}
        <StaggerList className="grid gap-4 sm:grid-cols-2">
          {projects.map((project) => (
            <StaggerItem key={project.id} className="h-full">
              <ProjectCard project={project} />
            </StaggerItem>
          ))}
        </StaggerList>
      </section>

      {/* Terminal-style vault easter egg. Meant to look like a prompt at
        * the bottom of the page — monospaced, dim, no visual emphasis.
        * People who know what `> vault` means will notice; the rest scroll
        * past. Keeps the vault deliberately understated on the front. */}
      <footer className="mt-24 border-t border-border pt-6">
        <Link
          href="/vault"
          className="inline-block font-mono text-xs text-foreground/70 transition-colors hover:text-accent-hover"
        >
          &gt; vault
        </Link>
      </footer>
    </div>
    </NowPlayingProvider>
  );
}
