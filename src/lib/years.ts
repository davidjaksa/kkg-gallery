export const YEAR_SLUG_PATTERN = /^\d{4}-\d{2}$/;

export function formatSchoolYear(startYear: number): string {
  const yy = String((startYear + 1) % 100).padStart(2, "0");
  return `${startYear}-${yy}`;
}

export function isValidStartYear(value: number): boolean {
  return Number.isInteger(value) && value >= 1900 && value <= 2100;
}

export function isValidSchoolYearSlug(slug: string, startYear?: number): boolean {
  if (!YEAR_SLUG_PATTERN.test(slug)) return false;
  const start = Number(slug.slice(0, 4));
  if (!isValidStartYear(start)) return false;
  if (startYear !== undefined && start !== startYear) return false;
  return slug === formatSchoolYear(start);
}

export function parseStartYearInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d{4}$/.test(trimmed)) return null;
  const year = Number(trimmed);
  return isValidStartYear(year) ? year : null;
}

export function yearDisplayName(year: {
  slug: string;
  label?: string | null;
  isCustom?: boolean;
}): string {
  if (year.isCustom && year.label?.trim()) return year.label.trim();
  return year.slug;
}
