import fs from "node:fs";
import path from "node:path";

export const DATA_DIR = path.join(process.cwd(), "data");
export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
export const ORIGINALS_DIR = path.join(UPLOADS_DIR, "originals");
export const THUMBS_DIR = path.join(UPLOADS_DIR, "thumbs");
export const DISPLAY_DIR = path.join(UPLOADS_DIR, "display");
export const COVERS_DIR = path.join(UPLOADS_DIR, "covers");

export function ensureUploadDirs() {
  for (const dir of [ORIGINALS_DIR, THUMBS_DIR, DISPLAY_DIR, COVERS_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function resolveUploadPath(relativePath: string): string {
  return path.join(UPLOADS_DIR, relativePath);
}

function realpathOrResolve(target: string): string {
  try {
    return fs.realpathSync(target);
  } catch {
    return path.resolve(target);
  }
}

export function isInsideUploads(absolutePath: string): boolean {
  try {
    const root = realpathOrResolve(UPLOADS_DIR);
    const resolved = realpathOrResolve(absolutePath);
    return resolved === root || resolved.startsWith(root + path.sep);
  } catch {
    return false;
  }
}

export function deleteUploadFile(relativePath: string | null | undefined) {
  if (!relativePath) return;
  const absolute = resolveUploadPath(relativePath);
  if (!isInsideUploads(absolute)) return;
  try {
    fs.unlinkSync(absolute);
  } catch {
    // missing file is fine
  }
}

export function hardenDatabaseFileMode() {
  const dbPath = path.join(DATA_DIR, "gallery.db");
  try {
    if (fs.existsSync(dbPath)) fs.chmodSync(dbPath, 0o600);
  } catch {
    // chmod may fail on some filesystems
  }
}
