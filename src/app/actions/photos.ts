"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { deletePhotoFilesIfUnshared } from "@/lib/photo-files";
import { canManageAlbum, requireStaff } from "@/lib/session";
import { albumPath, yearPath } from "@/lib/routes";

export async function deletePhoto(formData: FormData): Promise<{ error?: string }> {
  const user = await requireStaff();
  const id = String(formData.get("id") ?? "");
  const photo = await prisma.photo.findUnique({
    where: { id },
    include: { album: { include: { year: true } } },
  });
  if (!photo) return { error: "A fénykép nem található." };
  if (!canManageAlbum(user, photo.album)) {
    return { error: "Csak a saját albumaihoz tartozó képeket törölheti." };
  }

  await deletePhotoFilesIfUnshared(photo);
  await prisma.photo.delete({ where: { id } });

  revalidatePath(albumPath(photo.album.year.slug, photo.album.slug));
  revalidatePath(yearPath(photo.album.year.slug));
  revalidatePath("/admin");
  return {};
}
