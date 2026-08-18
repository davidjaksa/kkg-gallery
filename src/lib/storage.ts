import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { UPLOADS_DIR } from "@/lib/paths";

const execFileAsync = promisify(execFile);
const DEFAULT_QUOTA = 10 * 1024 * 1024 * 1024;
const CACHE_TTL_MS = 30 * 60 * 1000;
const MEASURE_TIMEOUT_MS = 10 * 60 * 1000;

type Usage = { used: number; quota: number; percent: number };

let cachedUsed = 0;
let measuredAt = 0;
let refresh: Promise<void> | null = null;

export function getStorageQuotaBytes(): number {
  const raw = process.env.STORAGE_QUOTA_BYTES;
  const parsed = raw ? Number(raw) : DEFAULT_QUOTA;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_QUOTA;
}

function toUsage(used: number): Usage {
  const quota = getStorageQuotaBytes();
  const percent = Math.min(100, Math.round((used / quota) * 100));
  return { used, quota, percent };
}

async function walkSize(dir: string): Promise<number> {
  let total = 0;
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return 0;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      total += await walkSize(full);
    } else if (entry.isFile()) {
      try {
        total += (await fs.stat(full)).size;
      } catch {
        // missing file is fine
      }
    }
  }
  return total;
}

async function measureUploadsBytes(dir: string): Promise<number> {
  try {
    await fs.access(dir);
  } catch {
    return 0;
  }

  try {
    const args = process.platform === "darwin" ? ["-sk", dir] : ["-sb", dir];
    const { stdout } = await execFileAsync("du", args, { timeout: MEASURE_TIMEOUT_MS });
    const value = Number(stdout.trim().split(/\s+/)[0]) || 0;
    return process.platform === "darwin" ? value * 1024 : value;
  } catch {
    return walkSize(dir);
  }
}

function refreshInBackground() {
  if (refresh) return;
  refresh = measureUploadsBytes(UPLOADS_DIR)
    .then((used) => {
      cachedUsed = used;
      measuredAt = Date.now();
    })
    .catch(() => {
      // keep the last successful measurement
    })
    .finally(() => {
      refresh = null;
    });
}

/** Instant. Never walks the uploads tree on the request thread. */
export function getStorageUsage(): Usage {
  const stale = measuredAt === 0 || Date.now() - measuredAt > CACHE_TTL_MS;
  if (stale) refreshInBackground();
  return toUsage(cachedUsed);
}

export function getUploadsSizeBytes(): number {
  return getStorageUsage().used;
}
