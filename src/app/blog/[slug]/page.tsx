import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPostBySlug } from "@/lib/db/queries/blog";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

/**
 * Public single-post page.
 *
 * Note the `publishedOnly: true` — a draft's URL 404s from the public
 * side. Admin still sees drafts via /admin/blog/[id]/edit.
 */
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

/**
 * generateMetadata runs on the server before render. Gives us <title> and
 * <meta description> per post so links to /blog/[slug] preview nicely
 * when shared (Twitter, iMessage, etc.). Falls back to a generic title if
 * the post is missing so the 404 page has a sensible tab title too.
 */
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug, true);
  if (!post) return { title: "Not found" };

  return {
    title: post.title,
    description: post.subtitle ?? undefined,
    openGraph: {
      title: post.title,
      description: post.subtitle ?? undefined,
      images: post.coverImageUrl ? [post.coverImageUrl] : undefined,
      type: "article",
      publishedTime: post.publishedAt?.toISOString(),
    },
  };
}

const dateFmt = new Intl.DateTimeFormat(undefined, {
  month: "long",
  day: "numeric",
  year: "numeric",
});

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug, true);
  if (!post) notFound();

  return (
    <article className="mx-auto max-w-3xl px-6 pt-20 pb-16 lg:px-12 lg:pt-16">
      <Link
        href="/blog"
        className="text-sm text-foreground/60 transition-colors hover:text-accent-hover"
      >
        ← All posts
      </Link>

      <header className="mt-8">
        {post.publishedAt ? (
          <time
            dateTime={post.publishedAt.toISOString()}
            className="text-xs uppercase tracking-[0.3em] text-accent-gold"
          >
            {dateFmt.format(post.publishedAt)}
          </time>
        ) : null}
        <h1 className="mt-4 text-4xl font-bold leading-tight text-foreground">
          {post.title}
        </h1>
        {post.subtitle ? (
          <p className="mt-4 text-lg leading-7 text-foreground/70">
            {post.subtitle}
          </p>
        ) : null}
        {post.tags.length > 0 ? (
          <ul className="mt-6 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full bg-foreground/5 px-3 py-1 text-xs text-foreground/60"
              >
                {tag}
              </li>
            ))}
          </ul>
        ) : null}
      </header>

      {post.coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.coverImageUrl}
          alt=""
          className="mt-10 w-full rounded-3xl border border-border"
        />
      ) : null}

      <div className="mt-10">
        <MarkdownRenderer markdown={post.bodyMarkdown} />
      </div>

      {post.changeLinks.length > 0 ? (
        <footer className="mt-16 rounded-3xl border border-border bg-foreground/3 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-accent-gold">
            Change links
          </p>
          <ul className="mt-4 space-y-2">
            {post.changeLinks.map((url) => (
              <li key={url}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all font-mono text-sm text-accent-coral underline decoration-accent-coral/40 underline-offset-4 transition-colors hover:text-accent-hover"
                >
                  {url}
                </a>
              </li>
            ))}
          </ul>
        </footer>
      ) : null}
    </article>
  );
}
