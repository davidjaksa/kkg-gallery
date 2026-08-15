const ASCII_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ISO_DATE = /\d{4}-\d{2}-\d{2}/g;
const YEAR_SPAN = /(?:19|20)\d{2}-(?:19|20)\d{2}/g;
const YEAR_PAIR = /(?:19|20)\d{2}-\d{2}/g;
const CALENDAR_YEAR = /(?:19|20)\d{2}/g;

export function slugifyEnglish(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function isValidEnglishSlug(slug: string): boolean {
  return ASCII_SLUG.test(slug) && slug.length >= 2 && slug.length <= 80;
}

export function stripYearTextFromAlbumSlug(slug: string): string {
  return slug
    .replace(ISO_DATE, "")
    .replace(YEAR_SPAN, "")
    .replace(YEAR_PAIR, "")
    .replace(CALENDAR_YEAR, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeAlbumSlug(slug: string, yearSlug?: string): string {
  let next = slug.trim().toLowerCase();
  if (yearSlug) {
    const prefix = `${yearSlug}-`;
    if (next.startsWith(prefix) && next.length > prefix.length) {
      next = next.slice(prefix.length);
    }
  }
  const stripped = stripYearTextFromAlbumSlug(next);
  if (isValidEnglishSlug(stripped)) return stripped.slice(0, 80);
  if (isValidEnglishSlug(next)) return next.slice(0, 80);
  return "album";
}

export function slugifyAlbum(title: string, yearSlug?: string): string {
  return normalizeAlbumSlug(slugifyEnglish(title), yearSlug);
}
