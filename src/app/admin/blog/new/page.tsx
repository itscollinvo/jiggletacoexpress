import Link from "next/link";
import { requireCurrentUser } from "@/lib/auth/auth";
import { PostForm } from "../post-form";
import { createPostAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewBlogPostPage() {
  await requireCurrentUser();

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-6 py-16">
      <div className="mb-8 space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-accent-gold">
          New post
        </p>
        <h1 className="text-3xl font-bold text-foreground">Write a post</h1>
        <p className="text-sm text-foreground/70">
          Save as draft to keep iterating, or hit Publish to make it live.
        </p>
      </div>

      <div className="rounded-3xl border border-border bg-background/95 p-8">
        <PostForm
          action={createPostAction}
          submitLabel="Create"
          autoSlug
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
