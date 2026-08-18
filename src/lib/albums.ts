import { MAX_ALBUM_DEPTH, isReservedAlbumSlug } from "@/lib/routes";

export { MAX_ALBUM_DEPTH };

export function parentKeyOf(parentId: string | null | undefined): string {
  return parentId ?? "";
}

export function albumDepth(album: { parentId: string | null }, byId: Map<string, { parentId: string | null }>): number {
  let depth = 1;
  let current = album.parentId;
  const seen = new Set<string>();
  while (current) {
    if (seen.has(current)) return MAX_ALBUM_DEPTH + 1;
    seen.add(current);
    depth += 1;
    current = byId.get(current)?.parentId ?? null;
    if (depth > MAX_ALBUM_DEPTH + 2) return depth;
  }
  return depth;
}

export function ancestorIds(
  albumId: string,
  byId: Map<string, { id: string; parentId: string | null }>,
): string[] {
  const ids: string[] = [];
  let current = byId.get(albumId)?.parentId ?? null;
  const seen = new Set<string>();
  while (current && !seen.has(current)) {
    seen.add(current);
    ids.push(current);
    current = byId.get(current)?.parentId ?? null;
  }
  return ids;
}

export function descendantIds(albumId: string, childrenOf: Map<string | null, { id: string }[]>): string[] {
  const out: string[] = [];
  const stack = [...(childrenOf.get(albumId) ?? [])];
  while (stack.length) {
    const node = stack.pop()!;
    out.push(node.id);
    stack.push(...(childrenOf.get(node.id) ?? []));
  }
  return out;
}

export function wouldCreateCycle(
  albumId: string,
  newParentId: string | null,
  byId: Map<string, { id: string; parentId: string | null }>,
): boolean {
  if (!newParentId) return false;
  if (newParentId === albumId) return true;
  return ancestorIds(newParentId, byId).includes(albumId);
}

export function depthAfterMove(
  albumId: string,
  newParentId: string | null,
  byId: Map<string, { id: string; parentId: string | null }>,
  childrenOf: Map<string | null, { id: string }[]>,
): number {
  const parent = newParentId ? byId.get(newParentId) : null;
  const parentDepth = parent ? albumDepth(parent, byId) : 0;
  const subtreeHeight = maxSubtreeHeight(albumId, childrenOf);
  return parentDepth + subtreeHeight;
}

function maxSubtreeHeight(albumId: string, childrenOf: Map<string | null, { id: string }[]>): number {
  const kids = childrenOf.get(albumId) ?? [];
  if (kids.length === 0) return 1;
  return 1 + Math.max(...kids.map((kid) => maxSubtreeHeight(kid.id, childrenOf)));
}

export function canMoveAlbum(args: {
  albumId: string;
  newParentId: string | null;
  byId: Map<string, { id: string; parentId: string | null }>;
  childrenOf: Map<string | null, { id: string }[]>;
}): { ok: true } | { ok: false; error: string } {
  const { albumId, newParentId, byId, childrenOf } = args;
  if (newParentId && !byId.has(newParentId)) {
    return { ok: false, error: "A szülőalbum nem található." };
  }
  if (wouldCreateCycle(albumId, newParentId, byId)) {
    return { ok: false, error: "Az albumot nem lehet a saját leszármazottjába helyezni." };
  }
  if (depthAfterMove(albumId, newParentId, byId, childrenOf) > MAX_ALBUM_DEPTH) {
    return { ok: false, error: `Az albumfa legfeljebb ${MAX_ALBUM_DEPTH} szint mély lehet.` };
  }
  return { ok: true };
}

export function slugPathOf(
  albumId: string,
  byId: Map<string, { id: string; slug: string; parentId: string | null }>,
): string[] {
  const slugs: string[] = [];
  let current: { id: string; slug: string; parentId: string | null } | undefined = byId.get(albumId);
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    slugs.unshift(current.slug);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return slugs;
}

export function isRootSlugAllowed(slug: string): boolean {
  return !isReservedAlbumSlug(slug);
}

export function indexAlbums<T extends { id: string; parentId: string | null }>(albums: T[]) {
  const byId = new Map(albums.map((album) => [album.id, album]));
  const childrenOf = new Map<string | null, T[]>();
  for (const album of albums) {
    const key = album.parentId;
    const list = childrenOf.get(key) ?? [];
    list.push(album);
    childrenOf.set(key, list);
  }
  return { byId, childrenOf };
}
