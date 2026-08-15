import { headers } from "next/headers";

type Bucket = { failures: number[]; blockedUntil: number };

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;
const buckets = new Map<string, Bucket>();

function prune(now: number, failures: number[]) {
  return failures.filter((at) => now - at < WINDOW_MS);
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || h.get("x-real-ip") || "unknown";
}

export function loginAllowed(ip: string, email: string): boolean {
  const key = `${ip}:${email.trim().toLowerCase()}`;
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket) return true;
  bucket.failures = prune(now, bucket.failures);
  if (bucket.blockedUntil > now) return false;
  if (bucket.failures.length >= MAX_FAILURES) {
    bucket.blockedUntil = now + WINDOW_MS;
    return false;
  }
  return true;
}

export function recordLoginFailure(ip: string, email: string) {
  const key = `${ip}:${email.trim().toLowerCase()}`;
  const now = Date.now();
  const bucket = buckets.get(key) ?? { failures: [], blockedUntil: 0 };
  bucket.failures = prune(now, bucket.failures);
  bucket.failures.push(now);
  if (bucket.failures.length >= MAX_FAILURES) {
    bucket.blockedUntil = now + WINDOW_MS;
  }
  buckets.set(key, bucket);
}

export function recordLoginSuccess(ip: string, email: string) {
  buckets.delete(`${ip}:${email.trim().toLowerCase()}`);
}
