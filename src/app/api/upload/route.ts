import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureUploadDirs } from "@/lib/paths";
import { canManageAlbum, getSessionUser } from "@/lib/session";
import { ALLOWED_MIME, MAX_UPLOAD_BYTES, processPhoto, sniffImageMime } from "@/lib/sharp";
import { getStorageUsage } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Bejelentkezés szükséges." }, { status: 401 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_UPLOAD_BYTES + 64 * 1024) {
    return NextResponse.json({ error: "A fájl mérete legfeljebb 10 MB lehet." }, { status: 413 });
  }

  const form = await request.formData();
  const albumId = String(form.get("albumId") ?? "");
  const file = form.get("file");

  if (!albumId) {
    return NextResponse.json({ error: "Válasszon albumot." }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Hiányzó fájl." }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "A fájl mérete legfeljebb 10 MB lehet." }, { status: 400 });
  }

  const album = await prisma.album.findUnique({ where: { id: albumId } });
  if (!album) {
    return NextResponse.json({ error: "Az album nem található." }, { status: 404 });
  }
  if (!canManageAlbum(user, album)) {
    return NextResponse.json(
      { error: "Csak a saját albumába tölthet fel." },
      { status: 403 },
    );
  }

  const { used, quota } = getStorageUsage();
  if (used + file.size > quota) {
    return NextResponse.json({ error: "A tárhelykvóta betelt." }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const sniffed = sniffImageMime(buffer);
  if (!sniffed) {
    return NextResponse.json({ error: "Csak JPG és PNG tölthető fel." }, { status: 400 });
  }
  if (file.type && ALLOWED_MIME.has(file.type) && file.type !== sniffed) {
    return NextResponse.json({ error: "Csak JPG és PNG tölthető fel." }, { status: 400 });
  }

  ensureUploadDirs();
  const id = randomUUID();

  const photo = await prisma.photo.create({
    data: {
      id,
      filename: file.name,
      originalPath: "",
      displayPath: "",
      thumbPath: "",
      status: "PROCESSING",
      albumId,
      uploadedById: user.id,
    },
  });

  try {
    const paths = await processPhoto({ id, buffer, mime: sniffed });
    const updated = await prisma.photo.update({
      where: { id: photo.id },
      data: { ...paths, status: "READY" },
    });
    return NextResponse.json({ photo: updated });
  } catch (error) {
    await prisma.photo.delete({ where: { id: photo.id } }).catch(() => undefined);
    console.error(error);
    return NextResponse.json({ error: "A kép feldolgozása sikertelen." }, { status: 500 });
  }
}
