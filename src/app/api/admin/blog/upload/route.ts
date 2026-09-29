import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireCurrentUser } from "@/lib/auth/auth";

/**
 * Image upload endpoint used by the blog editor.
 *
 * Auth-gated: requireCurrentUser() throws (which becomes a 500 or redirect
 * depending on the route type — we short-circuit with a 401 below to keep
 * the API contract clean for the client-side upload code).
 *
 * Why an API route instead of a Server Action:
 *   Server Actions serialize FormData through Next's action machinery, which
 *   works but adds latency and doesn't stream the upload. A plain fetch()
 *   with FormData to a route handler is simpler for binary uploads and
 *   returns a JSON body the client can easily consume.
 *
 * Storage layout:
 *   blob/blog/inline/<timestamp>-<name> — separate prefix from cover
 *   images so a listing tool can distinguish. `addRandomSuffix: true`
 *   guarantees no filename collisions.
 */
export async function POST(request: Request) {
  // Guard first. If the caller isn't logged in, don't even parse the body.
  try {
    await requireCurrentUser();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "missing file" },
      { status: 400 },
    );
  }

  // Belt-and-suspenders MIME check. Blob storage will accept anything but
  // we don't want the editor to upload PDFs or videos here — this endpoint
  // is specifically for inline blog images. `kind` selects the storage
  // prefix so cover images and inline images stay separate.
  const kindRaw = formData.get("kind");
  const kind = kindRaw === "cover" ? "cover" : "inline";

  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "file must be an image" },
      { status: 400 },
    );
  }

  // Cap at 8MB per file. Blog images should be lightweight; if you want a
  // huge asset, upload to Blob directly and paste the URL in the cover
  // field. Prevents accidental 50MB screenshot uploads that would eat the
  // Vercel Blob quota.
  const MAX_BYTES = 8 * 1024 * 1024;
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "file too large (max 8MB)" },
      { status: 413 },
    );
  }

  // Filename: preserve extension so browsers can render inline, prefix
  // with kind + timestamp for human-readable Blob listing.
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `blog/${kind}/${Date.now()}-${safeName}`;

  const blob = await put(key, file, {
    access: "public",
    addRandomSuffix: true,
  });

  return NextResponse.json({ url: blob.url });
}
