export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const { ensureUploadDirs, hardenDatabaseFileMode } = await import("@/lib/paths");
  const { ensureAdmin } = await import("@/lib/seed");

  ensureUploadDirs();
  hardenDatabaseFileMode();
  await ensureAdmin();
}
