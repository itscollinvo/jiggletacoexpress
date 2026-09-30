import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireCurrentUser } from "@/lib/auth/auth";

/**
 * Image upload endpoint for the projects admin form. Handles both
 * hero-image replacements and case-study screenshots via the `kind`
 * form field.
 *
 * Mirrors the blog upload route (src/app/api/admin/blog/upload/route.ts) —
 * kept separate rather than shared so each surface can evolve independently
 * (different size caps, different storage prefixes, future per-kind
 * transformations, etc.).
 *
 * Storage layout:
 *   projects/screenshot/<timestamp>-<name>
 *   projects/cover/<timestamp>-<name>
 * addRandomSuffix=true so filename collisions are impossible.
 */
export async function POST(request: Request) {
  try {
    await requireCurrentUser();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing file" }, { status: 400 });
  }

  const kindRaw = formData.get("kind");
  const kind = kindRaw === "cover" ? "cover" : "screenshot";

  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "file must be an image" },
      { status: 400 },
    );
  }

  // 8MB cap — same as the blog endpoint. Screenshots of full-page UIs
  // can be big; anything larger belongs uploaded directly to Blob and
  // pasted as a URL.
  const MAX_BYTES = 8 * 1024 * 1024;
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "file too large (max 8MB)" },
      { status: 413 },
    );
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `projects/${kind}/${Date.now()}-${safeName}`;

  const blob = await put(key, file, {
    access: "public",
    addRandomSuffix: true,
  });

  return NextResponse.json({ url: blob.url });
}
