import Link from "next/link";
import { getPublishedPosts } from "@/lib/db/queries/blog";

/**
 * Public blog index.
 *
 * force-dynamic because posts change independently of the code — a new
 * publish through /admin/blog should show up here without a redeploy. If
 * this ever gets slow we can switch to on-demand revalidation (the admin
 * actions already call revalidatePath("/blog")).
 */
export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat(undefined, {
  month: "long",
  day: "numeric",
  year: "numeric",
});

export default async function BlogIndexPage() {
  const posts = await getPublishedPosts();

  return (
    <div className="mx-auto max-w-3xl px-6 pt-20 pb-16 lg:px-12 lg:pt-16">
      <p className="text-sm uppercase tracking-[0.3em] text-accent-gold">
        Change-log
      </p>
      <h1 className="mt-3 text-4xl font-bold text-foreground">Blog</h1>
      <p className="mt-4 max-w-2xl leading-7 text-foreground/70">
        PRD-style entries about what shipped and why. Each post covers a
        change to the site: the problem, the approach, and what actually
        landed.
      </p>

      <div className="mt-6 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-foreground/50">
        <a
          href="/feed.xml"
          className="transition-colors hover:text-accent-hover"
        >
          RSS →
        </a>
      </div>

      {posts.length === 0 ? (
        <p className="mt-16 text-foreground/60">
          No posts yet. Come back soon.
        </p>
      ) : (
        <ul className="mt-12 space-y-8">
          {posts.map((post) => (
            <li key={post.id}>
              <Link
                href={`/blog/${post.slug}`}
                className="group block rounded-3xl border border-border p-6 transition-colors hover:border-accent-coral hover:bg-foreground/3"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h2 className="text-xl font-semibold text-foreground transition-colors group-hover:text-accent-hover">
                    {post.title}
                  </h2>
                  {post.publishedAt ? (
                    <time
                      dateTime={post.publishedAt.toISOString()}
                      className="text-xs uppercase tracking-[0.2em] text-foreground/50"
                    >
                      {dateFmt.format(post.publishedAt)}
                    </time>
                  ) : null}
                </div>
                {post.subtitle ? (
                  <p className="mt-3 leading-6 text-foreground/70">
                    {post.subtitle}
                  </p>
                ) : null}
                {post.tags.length > 0 ? (
                  <ul className="mt-4 flex flex-wrap gap-2">
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
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
