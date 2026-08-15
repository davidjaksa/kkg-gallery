import fs from "node:fs";
import path from "node:path";
import { UPLOADS_DIR } from "@/lib/paths";

const DEFAULT_QUOTA = 10 * 1024 * 1024 * 1024;

export function getStorageQuotaBytes(): number {
  const raw = process.env.STORAGE_QUOTA_BYTES;
  const parsed = raw ? Number(raw) : DEFAULT_QUOTA;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_QUOTA;
}

export function getUploadsSizeBytes(dir = UPLOADS_DIR): number {
  if (!fs.existsSync(dir)) return 0;
  let total = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      total += getUploadsSizeBytes(full);
    } else if (entry.isFile()) {
      total += fs.statSync(full).size;
    }
  }
  return total;
}

export function getStorageUsage() {
  const used = getUploadsSizeBytes();
  const quota = getStorageQuotaBytes();
  const percent = Math.min(100, Math.round((used / quota) * 100));
  return { used, quota, percent };
}
