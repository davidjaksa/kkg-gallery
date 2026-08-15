import { AlbumManager } from "@/components/album-manager";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { yearDisplayName } from "@/lib/years";

export const dynamic = "force-dynamic";

export default async function AdminAlbumsPage() {
  const user = await requireStaff();
  const years = await prisma.year.findMany({
    orderBy: [{ sortOrder: "asc" }, { startYear: "desc" }],
  });
  const albums = await prisma.album.findMany({
    orderBy: [
      { year: { sortOrder: "asc" } },
      { year: { startYear: "desc" } },
      { sortOrder: "asc" },
    ],
    include: {
      year: true,
      _count: { select: { photos: true } },
    },
  });

  const visible = user.role === "ADMIN" ? albums : albums.filter((album) => album.createdById === user.id);

  return (
    <AlbumManager
      years={years.map((year) => ({
        id: year.id,
        name: yearDisplayName(year),
        slug: year.slug,
      }))}
      albums={visible.map((album) => ({
        id: album.id,
        slug: album.slug,
        title: album.title,
        description: album.description,
        eventDate: album.eventDate?.toISOString() ?? null,
        published: album.published,
        yearId: album.yearId,
        yearName: yearDisplayName(album.year),
        yearSlug: album.year.slug,
        photoCount: album._count.photos,
        canManage: user.role === "ADMIN" || album.createdById === user.id,
      }))}
    />
  );
}
