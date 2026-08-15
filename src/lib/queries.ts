import { prisma } from "@/lib/db";
import { yearDisplayName } from "@/lib/years";
import { normalizeAlbumSlug } from "@/lib/slug";

const publishedAlbum = { published: true } as const;
const readyPhoto = { status: "READY" as const };
const yearAlbumOrder = [{ sortOrder: "asc" as const }, { eventDate: "desc" as const }];
const yearListOrder = [{ sortOrder: "asc" as const }, { startYear: "desc" as const }];

export async function getLatestYears(limit = 3) {
  return prisma.year.findMany({
    where: { albums: { some: publishedAlbum } },
    orderBy: yearListOrder,
    take: limit,
    include: {
      albums: {
        where: publishedAlbum,
        orderBy: yearAlbumOrder,
        include: {
          _count: { select: { photos: { where: readyPhoto } } },
          photos: {
            where: readyPhoto,
            orderBy: { createdAt: "asc" },
            take: 1,
            select: { thumbPath: true },
          },
        },
      },
    },
  });
}

export async function getAllPublicYears() {
  return prisma.year.findMany({
    where: { albums: { some: publishedAlbum } },
    orderBy: yearListOrder,
    include: {
      albums: {
        where: publishedAlbum,
        orderBy: yearAlbumOrder,
        include: {
          _count: { select: { photos: { where: readyPhoto } } },
          photos: {
            where: readyPhoto,
            orderBy: { createdAt: "asc" },
            take: 1,
            select: { thumbPath: true },
          },
        },
      },
    },
  });
}

export function yearStats(
  year: Awaited<ReturnType<typeof getAllPublicYears>>[number],
) {
  const albumCount = year.albums.length;
  const photoCount = year.albums.reduce((sum, album) => sum + album._count.photos, 0);
  const cover =
    year.coverPath ??
    year.albums.find((album) => album.photos[0]?.thumbPath)?.photos[0]?.thumbPath ??
    null;
  return { albumCount, photoCount, cover };
}

export async function getPublicYear(slug: string) {
  return prisma.year.findFirst({
    where: { slug, albums: { some: publishedAlbum } },
    include: {
      albums: {
        where: publishedAlbum,
        orderBy: yearAlbumOrder,
        include: {
          _count: { select: { photos: { where: readyPhoto } } },
          photos: {
            where: readyPhoto,
            orderBy: { createdAt: "asc" },
            take: 1,
            select: { thumbPath: true },
          },
        },
      },
    },
  });
}

export async function getPublicAlbum(yearSlug: string, albumSlug: string) {
  const whereYear = { published: true, year: { slug: yearSlug } } as const;
  const album =
    (await prisma.album.findFirst({
      where: { slug: albumSlug, ...whereYear },
      include: {
        year: true,
        photos: {
          where: readyPhoto,
          orderBy: { createdAt: "asc" },
        },
      },
    })) ??
    (await prisma.album.findFirst({
      where: { slug: normalizeAlbumSlug(albumSlug, yearSlug), ...whereYear },
      include: {
        year: true,
        photos: {
          where: readyPhoto,
          orderBy: { createdAt: "asc" },
        },
      },
    }));
  return album;
}

export async function getAlbumByLegacySlug(slug: string) {
  const exact = await prisma.album.findMany({
    where: { slug, published: true },
    include: { year: true },
  });
  if (exact.length === 1) return exact[0];

  const years = await prisma.year.findMany({ select: { id: true, slug: true } });
  for (const year of years) {
    const prefix = `${year.slug}-`;
    if (!slug.startsWith(prefix)) continue;
    const albumSlug = normalizeAlbumSlug(slug.slice(prefix.length), year.slug);
    if (!albumSlug) continue;
    const album = await prisma.album.findFirst({
      where: { slug: albumSlug, published: true, yearId: year.id },
      include: { year: true },
    });
    if (album) return album;
  }

  const normalized = normalizeAlbumSlug(slug);
  if (normalized !== slug) {
    const byNormalized = await prisma.album.findMany({
      where: { slug: normalized, published: true },
      include: { year: true },
    });
    if (byNormalized.length === 1) return byNormalized[0];
  }

  return exact[0] ?? null;
}

export async function getAlbumSidebar() {
  const years = await prisma.year.findMany({
    where: { albums: { some: publishedAlbum } },
    orderBy: yearListOrder,
    include: {
      albums: {
        where: publishedAlbum,
        orderBy: yearAlbumOrder,
        select: { slug: true, title: true },
      },
    },
  });
  return years.map((year) => ({
    slug: year.slug,
    name: yearDisplayName(year),
    albums: year.albums,
  }));
}

export async function searchPublic(query: string) {
  const q = query.trim();
  if (!q) {
    return { years: [], albums: [] };
  }

  const years = await prisma.year.findMany({
    where: {
      albums: { some: publishedAlbum },
      OR: [{ slug: { contains: q } }, { label: { contains: q } }],
    },
    orderBy: yearListOrder,
    include: {
      albums: {
        where: publishedAlbum,
        include: {
          _count: { select: { photos: { where: readyPhoto } } },
          photos: {
            where: readyPhoto,
            orderBy: { createdAt: "asc" },
            take: 1,
            select: { thumbPath: true },
          },
        },
      },
    },
  });

  const albums = await prisma.album.findMany({
    where: {
      published: true,
      OR: [
        { title: { contains: q } },
        { description: { contains: q } },
        { slug: { contains: q } },
      ],
    },
    orderBy: { createdAt: "desc" },
    include: {
      year: true,
      _count: { select: { photos: { where: readyPhoto } } },
      photos: {
        where: readyPhoto,
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { thumbPath: true },
      },
    },
  });

  return { years, albums };
}

export async function getStaffAlbums(userId: string, isAdmin: boolean) {
  return prisma.album.findMany({
    where: isAdmin ? undefined : { createdById: userId },
    orderBy: { createdAt: "desc" },
    include: {
      year: true,
      _count: { select: { photos: true } },
    },
  });
}

export async function getAllAlbumsForSelect() {
  return prisma.album.findMany({
    orderBy: [{ createdAt: "desc" }],
    include: { year: true },
  });
}
