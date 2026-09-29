import { NextResponse } from "next/server";
import { getPublishedPosts } from "@/lib/db/queries/blog";

/**
 * RSS 2.0 feed at /feed.xml.
 *
 * Serves every published blog post, newest first, in a format any RSS
 * reader (Feedly, NetNewsWire, Inoreader, or your own hand-rolled
 * aggregator) can consume.
 *
 * Why RSS 2.0 (not Atom):
 *   Both are supported everywhere; RSS is the more universally-recognized
 *   format and has a lower ceremony for a personal blog. Atom is stricter
 *   about dates and mandates more fields — nice for larger publishers,
 *   overkill here.
 *
 * Base URL derivation:
 *   We build absolute URLs (RSS requires them) by parsing the origin off
 *   `request.url`. That way this works on prod, preview deploys, and
 *   local dev without any env-var configuration. If Next ever proxies
 *   this behind a load balancer that strips origin, we'd need to fall
 *   back to a NEXT_PUBLIC_SITE_URL env var.
 *
 * Caching:
 *   `force-dynamic` means the feed is re-generated per request. Fine at
 *   our scale (single-user publishing). If it becomes a hotspot we can
 *   switch to on-demand revalidation triggered by the publish action.
 */
export const dynamic = "force-dynamic";

/**
 * XML entity escape. Anything user-authored (title, subtitle) has to be
 * escaped or the feed becomes malformed XML. Body content is wrapped in
 * <![CDATA[…]]> below which avoids the same problem for markdown source
 * (still need to escape "]]>" sequences but those are exceedingly rare
 * in prose).
 */
function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * RSS pubDate format is RFC-822, NOT ISO 8601. Date.prototype.toUTCString()
 * emits exactly this format ("Sat, 26 Sep 2026 20:15:00 GMT"), so we can
 * lean on it without pulling a formatter dependency.
 */
function rfc822(date: Date): string {
  return date.toUTCString();
}

export async function GET(request: Request) {
  const posts = await getPublishedPosts();
  const origin = new URL(request.url).origin;

  const siteTitle = "jiggletaco — Collin Vo";
  const siteDescription =
    "Change-log style posts about what shipped on jiggletaco.com and why.";

  const items = posts
    .map((post) => {
      const postUrl = `${origin}/blog/${post.slug}`;
      const pubDate = rfc822(post.publishedAt ?? post.updatedAt);
      // Description = subtitle if present, else empty. Body itself is
      // exposed via <content:encoded> only if we later add the content
      // namespace; for now we keep the summary lightweight and let readers
      // click through for the full post.
      const description = post.subtitle ? esc(post.subtitle) : "";
      return `    <item>
      <title>${esc(post.title)}</title>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${description}</description>
    </item>`;
    })
    .join("\n");

  // lastBuildDate reflects the most recent publish. Falls back to "now"
  // if there are zero published posts (feed still validates).
  const lastBuild = posts[0]?.publishedAt
    ? rfc822(posts[0].publishedAt)
    : rfc822(new Date());

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(siteTitle)}</title>
    <description>${esc(siteDescription)}</description>
    <link>${origin}</link>
    <atom:link href="${origin}/feed.xml" rel="self" type="application/rss+xml" />
    <language>en-us</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
${items}
  </channel>
</rss>
`;

  return new NextResponse(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      // Short public cache — readers politely check periodically, and we
      // don't want a stale feed hanging around for hours after a publish.
      // 5 minutes is a fair balance.
      "cache-control": "public, s-maxage=300, stale-while-revalidate=60",
    },
  });
}
