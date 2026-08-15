export function safeCallbackUrl(raw: string | null | undefined): string {
  const value = (raw ?? "").trim();
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/admin";
  if (value.startsWith("/login")) return "/admin";
  if (value === "/upload" || value.startsWith("/upload/")) return "/admin";
  return value;
}
