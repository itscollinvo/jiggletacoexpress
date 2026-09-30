import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireCurrentUser } from "@/lib/auth/auth";

/**
 * Upload endpoint for /about hobby photos. Same pattern as the blog and
 * project upload routes — auth-gated, image-only, 8MB cap. Stores under
 * `about/photos/*` in Vercel Blob.
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
  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "file must be an image" },
      { status: 400 },
    );
  }
  const MAX_BYTES = 8 * 1024 * 1024;
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "file too large (max 8MB)" },
      { status: 413 },
    );
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `about/photos/${Date.now()}-${safeName}`;

  const blob = await put(key, file, {
    access: "public",
    addRandomSuffix: true,
  });

  return NextResponse.json({ url: blob.url });
}
