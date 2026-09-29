import Link from "next/link";
import { requireCurrentUser } from "@/lib/auth/auth";
import { getAllPosts } from "@/lib/db/queries/blog";
import { DeletePostButton } from "./delete-button";

export const dynamic = "force-dynamic";

export default async function AdminBlogPage() {
  await requireCurrentUser();
  const posts = await getAllPosts();

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-6 py-16">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-accent-gold">
            Admin Blog
          </p>
          <h1 className="mt-3 text-3xl font-bold text-foreground">
            Manage posts
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-foreground/70">
            Change-log entries for the site. Drafts stay hidden until you hit
            Publish.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href="/admin/blog/new"
            className="rounded-2xl bg-accent-coral px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-hover"
          >
            New post
          </Link>
          <Link
            href="/admin"
            className="rounded-2xl border border-border px-4 py-2 text-sm text-foreground/80 transition-colors hover:border-accent-coral hover:text-accent-hover"
          >
            Back to dashboard
          </Link>
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-[2rem] border border-border">
        <table className="min-w-full divide-y divide-border text-left">
          <thead className="bg-foreground/5">
            <tr className="text-xs uppercase tracking-[0.2em] text-foreground/60">
              <th className="px-5 py-4 font-medium">Post</th>
              <th className="px-5 py-4 font-medium">Status</th>
              <th className="px-5 py-4 font-medium">Updated</th>
              <th className="px-5 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-background">
            {posts.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-5 py-12 text-center text-sm text-foreground/60"
                >
                  No posts yet.{" "}
                  <Link
                    href="/admin/blog/new"
                    className="text-accent-coral hover:text-accent-hover"
                  >
                    Write your first one →
                  </Link>
                </td>
              </tr>
            ) : (
              posts.map((post) => (
                <tr key={post.id} className="align-top">
                  <td className="px-5 py-4">
                    <p className="font-medium text-foreground">
                      {post.title}
                    </p>
                    {post.subtitle ? (
                      <p className="mt-1 max-w-xl text-sm leading-6 text-foreground/70">
                        {post.subtitle}
                      </p>
                    ) : null}
                    <p className="mt-1 font-mono text-xs text-foreground/50">
                      /blog/{post.slug}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                        post.status === "published"
                          ? "bg-accent-gold/15 text-accent-gold"
                          : "bg-foreground/5 text-foreground/60"
                      }`}
                    >
                      {post.status === "published" ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-foreground/70">
                    {post.updatedAt.toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/admin/blog/${post.id}/edit`}
                        className="rounded-xl border border-border px-3 py-1.5 text-xs text-foreground/80 transition-colors hover:border-accent-coral hover:text-accent-hover"
                      >
                        Edit
                      </Link>
                      <DeletePostButton
                        postId={post.id}
                        postTitle={post.title}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
