import "server-only";
import { eq, desc } from "drizzle-orm";
import { getDb } from "../index";
import { vaultPhotos, type NewVaultPhoto } from "../schema";

export async function getAllVaultPhotos() {
  const db = getDb();
  return db
    .select()
    .from(vaultPhotos)
    .orderBy(desc(vaultPhotos.createdAt));
}

export async function createVaultPhoto(
  input: Omit<NewVaultPhoto, "id" | "createdAt" | "updatedAt">,
) {
  const db = getDb();
  const [row] = await db.insert(vaultPhotos).values(input).returning();
  return row;
}

export async function deleteVaultPhoto(id: number) {
  const db = getDb();
  await db.delete(vaultPhotos).where(eq(vaultPhotos.id, id));
}
