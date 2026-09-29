import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth/auth";
import { getPostById } from "@/lib/db/queries/blog";
import { PostForm } from "../../post-form";
import { updatePostAction } from "../../actions";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
};

export default async function EditBlogPostPage({
  params,
  searchParams,
}: PageProps) {
  await requireCurrentUser();

  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const post = await getPostById(id);
  if (!post) notFound();

  const { saved } = await searchParams;

  const boundAction = updatePostAction.bind(null, id);

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-6 py-16">
      <div className="mb-8 space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-accent-gold">
          Edit post
        </p>
        <h1 className="text-3xl font-bold text-foreground">{post.title}</h1>
        <p className="text-sm text-foreground/70">
          Status:{" "}
          <span
            className={
              post.status === "published"
                ? "text-accent-gold"
                : "text-foreground/60"
            }
          >
            {post.status === "published" ? "Published" : "Draft"}
          </span>
          {post.publishedAt ? (
            <>
              {" · first published "}
              {post.publishedAt.toLocaleDateString()}
            </>
          ) : null}
        </p>
      </div>

      {saved ? (
        <p className="mb-6 rounded-2xl border border-accent-gold/30 bg-accent-gold/10 px-4 py-3 text-sm text-accent-gold">
          Saved.
        </p>
      ) : null}

      <div className="rounded-3xl border border-border bg-background/95 p-8">
        <PostForm
          action={boundAction}
          submitLabel="Save"
          defaults={{
            title: post.title,
            subtitle: post.subtitle,
            slug: post.slug,
            bodyMarkdown: post.bodyMarkdown,
            coverImageUrl: post.coverImageUrl,
            changeLinks: post.changeLinks,
            tags: post.tags,
            status: post.status as "draft" | "published",
          }}
        />
      </div>

      <Link
        href="/admin/blog"
        className="mt-8 inline-block text-sm text-foreground/70 transition-colors hover:text-accent-hover"
      >
        ← Back to posts
      </Link>
    </div>
  );
}
