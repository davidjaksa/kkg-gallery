import { prisma } from "@/lib/db";
import { deleteUploadFile } from "@/lib/paths";

export async function deletePhotoFilesIfUnshared(photo: {
  id: string;
  originalPath: string;
  displayPath: string;
  thumbPath: string;
}) {
  const shared = await prisma.photo.count({
    where: { originalPath: photo.originalPath, NOT: { id: photo.id } },
  });
  if (shared > 0) return;
  deleteUploadFile(photo.originalPath);
  deleteUploadFile(photo.displayPath);
  deleteUploadFile(photo.thumbPath);
}
