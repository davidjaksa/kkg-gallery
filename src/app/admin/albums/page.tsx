import { AlbumManager } from "@/components/album-manager";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminAlbumsPage() {
  const user = await requireStaff();
  const albums = await prisma.album.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { photos: true, children: true } } },
  });
  const visible = user.role === "ADMIN" ? albums : albums.filter((album) => album.createdById === user.id);

  return (
    <AlbumManager
      albums={visible.map((album) => ({
        id: album.id,
        slug: album.slug,
        title: album.title,
        description: album.description,
        eventDate: album.eventDate?.toISOString() ?? null,
        published: album.published,
        parentId: album.parentId,
        sortOrder: album.sortOrder,
        photoCount: album._count.photos,
        childCount: album._count.children,
        canManage: user.role === "ADMIN" || album.createdById === user.id,
        coverPath: album.coverPath,
        createdById: album.createdById,
      }))}
    />
  );
}
