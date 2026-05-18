"use server";

import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";
import { requireCurrentUser } from "@/lib/auth/auth";
import { createVaultPhoto, deleteVaultPhoto } from "@/lib/db/queries/vault";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const MAX_BYTES = 10 * 1024 * 1024; // 10MB — photos may be larger than project thumbnails

export type VaultActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function uploadVaultPhotoAction(
  _prev: VaultActionResult | null,
  formData: FormData,
): Promise<VaultActionResult> {
  await requireCurrentUser();

  const file = formData.get("photo");
  const caption = String(formData.get("caption") ?? "").trim();
  const takenAt = String(formData.get("takenAt") ?? "").trim() || null;

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No file selected." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "File must be 10MB or smaller." };
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return { ok: false, error: "Must be PNG, JPEG, WebP, or GIF." };
  }

  // Derive a clean filename for the terminal (e.g. "joshua-tree.jpg")
  // Strip special chars, lowercase, keep extension
  const ext = file.name.split(".").pop() ?? "jpg";
  const base = file.name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const filename = `${base}.${ext}`;

  const blob = await put(`vault/photos/${Date.now()}-${filename}`, file, {
    access: "public",
    addRandomSuffix: true,
  });

  await createVaultPhoto({ filename, url: blob.url, caption, takenAt });

  revalidatePath("/admin/vault");
  revalidatePath("/vault/home/photos");

  return { ok: true };
}

export async function deleteVaultPhotoAction(formData: FormData) {
  await requireCurrentUser();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;
  await deleteVaultPhoto(id);
  revalidatePath("/admin/vault");
  revalidatePath("/vault/home/photos");
}
