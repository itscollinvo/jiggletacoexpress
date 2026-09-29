/**
 * Static GitHub PR embed card.
 *
 * Pure server component — no network calls, no client interactivity. Given
 * an owner/repo/number extracted from a github.com/*\/pull/N URL, it
 * renders a styled card that stands out from an inline link but doesn't
 * require any external API to build.
 *
 * We keep this static (rather than fetching PR title/status from GitHub's
 * REST API) because:
 *   1. No env-var setup or rate-limit worries — public site pages that
 *      might get scraped won't get 403s from GitHub.
 *   2. No dependency on network availability during page render.
 *   3. The URL alone communicates enough — reader can click through for
 *      more detail. If we later want live titles/status, we upgrade the
 *      component to fetch + cache in blog_posts.pr_embeds (Phase B.4+).
 *
 * Design note: rendered as a block (not inline) so it doesn't visually
 * compete with paragraph flow. Uses the same accent palette as the rest
 * of the site.
 */

interface Props {
  owner: string;
  repo: string;
  number: number;
  url: string;
}

export function PrCard({ owner, repo, number, url }: Props) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="not-prose my-4 flex items-center gap-4 rounded-2xl border border-border bg-foreground/3 px-5 py-4 no-underline transition-colors hover:border-accent-coral hover:bg-foreground/5"
    >
      {/* GitHub octocat mark — inline SVG so the card has no dependency on
       * a font/icon bundle. Sized to feel like a chip badge. */}
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-6 w-6 shrink-0 text-foreground/70"
        fill="currentColor"
      >
        <path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.92c.57.1.78-.25.78-.55v-2.04c-3.2.7-3.87-1.37-3.87-1.37-.52-1.32-1.28-1.67-1.28-1.67-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.12-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.63 1.59.24 2.76.12 3.05.74.81 1.18 1.84 1.18 3.1 0 4.43-2.7 5.4-5.27 5.69.41.36.77 1.05.77 2.13v3.16c0 .3.21.66.79.55A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
      </svg>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">
          {owner}/{repo}
        </p>
        <p className="text-xs text-foreground/60">Pull request #{number}</p>
      </div>
    </a>
  );
}

/**
 * Parse a URL string and return the {owner, repo, number} tuple if it's
 * a github.com pull request URL, else null. Recognizes both PR URLs
 * (/pull/N) and the shorter alias (/pull/N/files, /pull/N/commits) —
 * we normalize down to just the base PR page.
 *
 * Exported so both the server and client markdown renderers can share
 * the same detection logic.
 */
export function parseGithubPr(href: string | undefined): {
  owner: string;
  repo: string;
  number: number;
  url: string;
} | null {
  if (!href) return null;
  try {
    const u = new URL(href);
    if (u.hostname !== "github.com") return null;
    // /<owner>/<repo>/pull/<number>[/anything]
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 4 || parts[2] !== "pull") return null;
    const number = Number(parts[3]);
    if (!Number.isInteger(number) || number <= 0) return null;
    return {
      owner: parts[0]!,
      repo: parts[1]!,
      number,
      url: `https://github.com/${parts[0]}/${parts[1]}/pull/${number}`,
    };
  } catch {
    return null;
  }
}
