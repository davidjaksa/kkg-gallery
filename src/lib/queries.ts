import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { indexAlbums, slugPathOf } from "@/lib/albums";
import { albumPath } from "@/lib/routes";
import { normalizeAlbumSlug } from "@/lib/slug";
import { homepageTake, type HomepageAlbumCount } from "@/lib/settings";

const readyPhoto = { status: "READY" as const };
const albumOrder = [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }];

const albumGraphInclude = {
  _count: { select: { photos: { where: readyPhoto }, children: true } },
  photos: {
    where: readyPhoto,
    orderBy: { createdAt: "asc" as const },
    take: 1,
    select: { thumbPath: true },
  },
} satisfies Prisma.AlbumInclude;

export type AlbumListRow = Prisma.AlbumGetPayload<{ include: typeof albumGraphInclude }>;

async function loadAlbumGraph() {
  return prisma.album.findMany({
    orderBy: albumOrder,
    include: albumGraphInclude,
  });
}

function childrenMap(albums: AlbumListRow[]): Map<string | null, AlbumListRow[]> {
  return indexAlbums(albums).childrenOf;
}

function hasPublishedDescendant(albumId: string, childrenOf: Map<string | null, AlbumListRow[]>): boolean {
  const kids = childrenOf.get(albumId) ?? [];
  for (const kid of kids) {
    if (kid.published || hasPublishedDescendant(kid.id, childrenOf)) return true;
  }
  return false;
}

function isPubliclyReachable(album: AlbumListRow, childrenOf: Map<string | null, AlbumListRow[]>) {
  return album.published || hasPublishedDescendant(album.id, childrenOf);
}

function descendantPhotoCount(albumId: string, childrenOf: Map<string | null, AlbumListRow[]>): number {
  const kids = childrenOf.get(albumId) ?? [];
  let total = 0;
  for (const kid of kids) {
    total += kid._count.photos + descendantPhotoCount(kid.id, childrenOf);
  }
  return total;
}

function publicChildCount(albumId: string, childrenOf: Map<string | null, AlbumListRow[]>) {
  return (childrenOf.get(albumId) ?? []).filter((kid) => isPubliclyReachable(kid, childrenOf)).length;
}

function coverOf(album: AlbumListRow, childrenOf: Map<string | null, AlbumListRow[]>): string | null {
  if (album.coverPath) return album.coverPath;
  if (album.photos[0]?.thumbPath) return album.photos[0].thumbPath;
  for (const kid of childrenOf.get(album.id) ?? []) {
    const nested = coverOf(kid, childrenOf);
    if (nested) return nested;
  }
  return null;
}

export function albumStats(album: AlbumListRow, albums?: AlbumListRow[]) {
  const childrenOf = albums ? childrenMap(albums) : childrenMap([album]);
  return {
    albumCount: publicChildCount(album.id, childrenOf),
    photoCount: album._count.photos + descendantPhotoCount(album.id, childrenOf),
    cover: coverOf(album, childrenOf),
  };
}

export async function getPublicRootAlbums(limit?: number) {
  const albums = await loadAlbumGraph();
  const childrenOf = childrenMap(albums);
  const roots = albums.filter((album) => !album.parentId && isPubliclyReachable(album, childrenOf));
  return {
    albums,
    roots: typeof limit === "number" ? roots.slice(0, limit) : roots,
  };
}

export async function getHomepageAlbums(count: HomepageAlbumCount) {
  return getPublicRootAlbums(homepageTake(count));
}

export async function getAllPublicRootAlbums() {
  return getPublicRootAlbums();
}

export async function getPublicAlbumByPath(slugs: string[]) {
  if (slugs.length === 0 || slugs.length > 5) return null;
  const albums = await loadAlbumGraph();
  const childrenOf = childrenMap(albums);
  let parentId: string | null = null;
  let current: AlbumListRow | undefined;

  for (const raw of slugs) {
    const siblings: AlbumListRow[] = childrenOf.get(parentId) ?? [];
    current =
      siblings.find((album: AlbumListRow) => album.slug === raw) ??
      siblings.find((album: AlbumListRow) => album.slug === normalizeAlbumSlug(raw));
    if (!current || !isPubliclyReachable(current, childrenOf)) return null;
    parentId = current.id;
  }
  if (!current) return null;

  const publicChildren = (childrenOf.get(current.id) ?? []).filter((kid) =>
    isPubliclyReachable(kid, childrenOf),
  );

  const photos = current.published
    ? await prisma.photo.findMany({
        where: { albumId: current.id, status: "READY" },
        orderBy: { createdAt: "asc" },
      })
    : [];

  const { byId } = indexAlbums(albums);
  const crumbs = slugPathOf(current.id, byId).map((slug, index, all) => {
    const id = walkPath(albums, childrenOf, all.slice(0, index + 1))?.id;
    const node = id ? albums.find((album) => album.id === id) : undefined;
    return {
      title: node?.title ?? slug,
      href: albumPath(all.slice(0, index + 1)),
    };
  });

  return {
    album: current,
    children: publicChildren,
    photos,
    crumbs,
    slugs: slugPathOf(current.id, byId),
  };
}

function walkPath(albums: AlbumListRow[], childrenOf: Map<string | null, AlbumListRow[]>, slugs: string[]) {
  let parentId: string | null = null;
  let current: AlbumListRow | undefined;
  for (const slug of slugs) {
    current = (childrenOf.get(parentId) ?? []).find((album) => album.slug === slug);
    if (!current) return null;
    parentId = current.id;
  }
  return current ?? null;
}

export async function getAlbumByLegacySlug(slug: string) {
  const albums = await loadAlbumGraph();
  const childrenOf = childrenMap(albums);
  const { byId } = indexAlbums(albums);
  const published = albums.filter((album) => album.published);
  const exact = published.filter((album) => album.slug === slug);
  if (exact.length === 1) {
    return { album: exact[0], slugs: slugPathOf(exact[0].id, byId) };
  }

  for (const root of albums.filter((album) => !album.parentId)) {
    const prefix = `${root.slug}-`;
    if (!slug.startsWith(prefix)) continue;
    const albumSlug = normalizeAlbumSlug(slug.slice(prefix.length), root.slug);
    const kids = childrenOf.get(root.id) ?? [];
    const match = kids.find((album) => album.published && album.slug === albumSlug);
    if (match) return { album: match, slugs: slugPathOf(match.id, byId) };
  }

  const normalized = normalizeAlbumSlug(slug);
  if (normalized !== slug) {
    const byNormalized = published.filter((album) => album.slug === normalized);
    if (byNormalized.length === 1) {
      return { album: byNormalized[0], slugs: slugPathOf(byNormalized[0].id, byId) };
    }
  }

  if (exact[0]) return { album: exact[0], slugs: slugPathOf(exact[0].id, byId) };
  return null;
}

export type SidebarNode = {
  id: string;
  slug: string;
  title: string;
  href: string;
  children: SidebarNode[];
};

export async function getAlbumSidebar(): Promise<SidebarNode[]> {
  const albums = await loadAlbumGraph();
  const childrenOf = childrenMap(albums);
  const { byId } = indexAlbums(albums);

  function toNode(album: AlbumListRow): SidebarNode | null {
    if (!isPubliclyReachable(album, childrenOf)) return null;
    const kids = (childrenOf.get(album.id) ?? [])
      .map(toNode)
      .filter((node): node is SidebarNode => node !== null);
    return {
      id: album.id,
      slug: album.slug,
      title: album.title,
      href: albumPath(slugPathOf(album.id, byId)),
      children: kids,
    };
  }

  return albums
    .filter((album) => !album.parentId)
    .map(toNode)
    .filter((node): node is SidebarNode => node !== null);
}

export async function searchPublic(query: string) {
  const q = query.trim();
  if (!q) return { albums: [] as Array<AlbumListRow & { slugs: string[] }> };

  const albums = await loadAlbumGraph();
  const childrenOf = childrenMap(albums);
  const { byId } = indexAlbums(albums);
  const needle = q.toLowerCase();

  const matches = albums.filter((album) => {
    if (!isPubliclyReachable(album, childrenOf)) return false;
    return (
      album.title.toLowerCase().includes(needle) ||
      album.slug.toLowerCase().includes(needle) ||
      (album.description ?? "").toLowerCase().includes(needle)
    );
  });

  return {
    albums: matches.map((album) => ({ ...album, slugs: slugPathOf(album.id, byId) })),
  };
}

export async function getStaffAlbums(userId: string, isAdmin: boolean) {
  return prisma.album.findMany({
    where: isAdmin ? undefined : { createdById: userId },
    orderBy: albumOrder,
    include: {
      _count: { select: { photos: true, children: true } },
    },
  });
}

export async function getAllAlbumsForSelect() {
  return prisma.album.findMany({
    orderBy: albumOrder,
  });
}

export async function getAdminAlbumTree() {
  return prisma.album.findMany({
    orderBy: albumOrder,
    include: {
      _count: { select: { photos: true, children: true } },
    },
  });
}
