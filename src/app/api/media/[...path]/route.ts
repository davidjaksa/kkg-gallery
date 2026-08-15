import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isInsideUploads, resolveUploadPath } from "@/lib/paths";
import { canManageAlbum, getSessionUser } from "@/lib/session";

export const runtime = "nodejs";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

const MAX_CONCURRENT_READS = 32;
let activeReads = 0;
const waiters: Array<() => void> = [];

async function withMediaSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (activeReads >= MAX_CONCURRENT_READS) {
    await new Promise<void>((resolve) => waiters.push(resolve));
  }
  activeReads += 1;
  try {
    return await fn();
  } finally {
    activeReads -= 1;
    waiters.shift()?.();
  }
}

function decodeSegments(segments: string[]): string | null {
  try {
    return segments.map((segment) => decodeURIComponent(segment)).join("/");
  } catch {
    return null;
  }
}

function parseRange(header: string | null, size: number): { start: number; end: number } | null {
  if (!header?.startsWith("bytes=")) return null;
  const [startRaw, endRaw] = header.slice(6).split("-", 2);
  const start = startRaw ? Number(startRaw) : 0;
  const end = endRaw ? Number(endRaw) : size - 1;
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end >= size || start > end) {
    return null;
  }
  return { start, end };
}

function notFound() {
  return new NextResponse("Not found", { status: 404 });
}

export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await context.params;
  if (!segments?.length) return notFound();

  const relative = decodeSegments(segments);
  if (!relative) return notFound();

  const absolute = resolveUploadPath(relative);
  if (!isInsideUploads(absolute) || !fs.existsSync(absolute)) return notFound();

  const user = await getSessionUser();
  let cachePublic = false;

  if (relative.startsWith("covers/")) {
    const year = await prisma.year.findFirst({
      where: { coverPath: relative },
      include: { _count: { select: { albums: { where: { published: true } } } } },
    });
    if (!year) return notFound();
    const published = year._count.albums > 0;
    if (!published && !user) return notFound();
    cachePublic = published;
  } else {
    const photo = await prisma.photo.findFirst({
      where: {
        OR: [{ originalPath: relative }, { displayPath: relative }, { thumbPath: relative }],
      },
      include: { album: true },
    });
    if (!photo) return notFound();

    const isOriginal = relative === photo.originalPath;
    if (!photo.album.published || isOriginal) {
      if (!user || !canManageAlbum(user, photo.album)) return notFound();
      cachePublic = false;
    } else {
      cachePublic = true;
    }
  }

  return withMediaSlot(async () => {
    const stat = fs.statSync(absolute);
    const ext = path.extname(absolute).toLowerCase();
    const type = MIME[ext] ?? "application/octet-stream";
    const range = parseRange(request.headers.get("range"), stat.size);
    const cacheControl = cachePublic ? "public, max-age=31536000, immutable" : "private, no-store";
    const headers: Record<string, string> = {
      "Content-Type": type,
      "Cache-Control": cacheControl,
      Vary: "Cookie",
      "Accept-Ranges": "bytes",
    };

    if (range) {
      const length = range.end - range.start + 1;
      headers["Content-Range"] = `bytes ${range.start}-${range.end}/${stat.size}`;
      headers["Content-Length"] = String(length);
      const stream = fs.createReadStream(absolute, { start: range.start, end: range.end });
      return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
        status: 206,
        headers,
      });
    }

    headers["Content-Length"] = String(stat.size);
    const stream = fs.createReadStream(absolute);
    return new NextResponse(Readable.toWeb(stream) as ReadableStream, { headers });
  });
}
