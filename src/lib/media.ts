export function mediaUrl(relativePath: string | null | undefined): string | null {
  if (!relativePath) return null;
  return `/api/media/${relativePath.split("/").map(encodeURIComponent).join("/")}`;
}
