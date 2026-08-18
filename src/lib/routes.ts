export const RESERVED_ALBUM_SLUGS = new Set([
  "admin",
  "album",
  "api",
  "archive",
  "login",
  "search",
  "upload",
  "year",
]);

export const MAX_ALBUM_DEPTH = 5;

export function albumPath(slugs: string[]): string {
  const clean = slugs.filter(Boolean);
  if (clean.length === 0) return "/";
  return `/${clean.join("/")}`;
}

export function yearPath(yearSlug: string): string {
  return albumPath([yearSlug]);
}

export function isReservedAlbumSlug(slug: string): boolean {
  return RESERVED_ALBUM_SLUGS.has(slug);
}

/** @deprecated use isReservedAlbumSlug */
export function isReservedYearSlug(slug: string): boolean {
  return isReservedAlbumSlug(slug);
}
