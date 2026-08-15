export const RESERVED_YEAR_SLUGS = new Set([
  "admin",
  "album",
  "api",
  "archive",
  "login",
  "search",
  "upload",
  "year",
]);

export function yearPath(yearSlug: string): string {
  return `/${yearSlug}`;
}

export function albumPath(yearSlug: string, albumSlug: string): string {
  return `/${yearSlug}/${albumSlug}`;
}

export function isReservedYearSlug(slug: string): boolean {
  return RESERVED_YEAR_SLUGS.has(slug);
}
