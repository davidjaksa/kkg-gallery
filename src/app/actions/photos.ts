"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { deletePhotoFilesIfUnshared } from "@/lib/photo-files";
import { indexAlbums, slugPathOf } from "@/lib/albums";
import { canManageAlbum, requireStaff } from "@/lib/session";
import { albumPath } from "@/lib/routes";

export async function deletePhoto(formData: FormData): Promise<{ error?: string }> {
  const user = await requireStaff();
  const id = String(formData.get("id") ?? "");
  const photo = await prisma.photo.findUnique({
    where: { id },
    include: { album: true },
  });
  if (!photo) return { error: "A fénykép nem található." };
  if (!canManageAlbum(user, photo.album)) {
    return { error: "Csak a saját albumaihoz tartozó képeket törölheti." };
  }

  await deletePhotoFilesIfUnshared(photo);
  await prisma.photo.delete({ where: { id } });

  const albums = await prisma.album.findMany({ select: { id: true, slug: true, parentId: true } });
  const { byId } = indexAlbums(albums);
  revalidatePath(albumPath(slugPathOf(photo.albumId, byId)));
  revalidatePath("/admin");
  return {};
}
