"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  canMoveAlbum,
  indexAlbums,
  parentKeyOf,
  slugPathOf,
} from "@/lib/albums";
import { deletePhotoFilesIfUnshared } from "@/lib/photo-files";
import { deleteUploadFile, ensureUploadDirs } from "@/lib/paths";
import { albumPath, isReservedAlbumSlug, MAX_ALBUM_DEPTH } from "@/lib/routes";
import { canManageAlbum, requireStaff } from "@/lib/session";
import { processCover, MAX_UPLOAD_BYTES, sniffImageMime } from "@/lib/sharp";
import { isValidEnglishSlug, normalizeAlbumSlug, slugifyAlbum } from "@/lib/slug";

function parseEventDate(raw: string): Date | null {
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function coverErrorMessage(error: unknown): string | null {
  if (error instanceof Error && error.message === "COVER_TOO_LARGE") {
    return "A borítókép legfeljebb 10 MB lehet.";
  }
  if (error instanceof Error && (error.message === "COVER_INVALID" || error.message === "Invalid image type")) {
    return "A borítókép csak JPG vagy PNG lehet.";
  }
  return null;
}

async function processOptionalCover(existingPath: string | null, formData: FormData) {
  const cover = formData.get("cover");
  if (!(cover instanceof File) || cover.size === 0) return existingPath;
  if (cover.size > MAX_UPLOAD_BYTES) {
    throw new Error("COVER_TOO_LARGE");
  }
  ensureUploadDirs();
  const buffer = Buffer.from(await cover.arrayBuffer());
  if (!sniffImageMime(buffer)) {
    throw new Error("COVER_INVALID");
  }
  deleteUploadFile(existingPath);
  return processCover({ id: randomUUID(), buffer });
}

async function loadTree() {
  const albums = await prisma.album.findMany({
    select: { id: true, parentId: true, slug: true, createdById: true },
  });
  return { albums, ...indexAlbums(albums) };
}

async function revalidateTree(albumId?: string) {
  revalidatePath("/");
  revalidatePath("/archive");
  revalidatePath("/search");
  revalidatePath("/admin/albums");
  revalidatePath("/admin");
  if (!albumId) return;
  const { byId } = await loadTree();
  const album = byId.get(albumId);
  if (!album) return;
  revalidatePath(albumPath(slugPathOf(albumId, byId)));
}

async function uniqueSlug(parentId: string | null, slug: string, excludeId?: string) {
  const clash = await prisma.album.findFirst({
    where: {
      parentKey: parentKeyOf(parentId),
      slug,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
  });
  return !clash;
}

function parseParentId(raw: string): string | null {
  const value = raw.trim();
  if (!value || value === "root") return null;
  return value;
}

export async function createAlbum(formData: FormData): Promise<{ error?: string }> {
  const user = await requireStaff();
  const title = String(formData.get("title") ?? "").trim();
  const parentId = parseParentId(String(formData.get("parentId") ?? ""));
  if (!title) return { error: "Az album címe kötelező." };

  const { byId, childrenOf } = await loadTree();
  if (parentId && !byId.has(parentId)) return { error: "A szülőalbum nem található." };

  const parentDepth = parentId ? (await (async () => {
    let depth = 1;
    let current: string | null = parentId;
    while (current) {
      depth += 1;
      current = byId.get(current)?.parentId ?? null;
      if (depth > MAX_ALBUM_DEPTH) return depth;
    }
    return depth;
  })()) : 1;

  if (parentDepth > MAX_ALBUM_DEPTH) {
    return { error: `Az albumfa legfeljebb ${MAX_ALBUM_DEPTH} szint mély lehet.` };
  }

  if (parentId && user.role !== "ADMIN") {
    const parent = byId.get(parentId);
    if (!parent || parent.createdById !== user.id) {
      return { error: "Csak a saját albumai alá hozhat létre alalbumot." };
    }
  }

  const slugRaw = normalizeAlbumSlug(String(formData.get("slug") ?? "").trim() || slugifyAlbum(title));
  if (!isValidEnglishSlug(slugRaw)) {
    return {
      error: "Az URL-azonosító angol kebab-case legyen (pl. sports-day), ékezet nélkül.",
    };
  }
  if (!parentId && isReservedAlbumSlug(slugRaw)) {
    return { error: "Ez az URL-azonosító foglalt egy beépített oldallal." };
  }
  if (!(await uniqueSlug(parentId, slugRaw))) {
    return { error: "Ebben a mappában ez az URL-azonosító már foglalt." };
  }

  const description = String(formData.get("description") ?? "").trim() || null;
  const eventDate = parseEventDate(String(formData.get("eventDate") ?? ""));
  const published = String(formData.get("published") ?? "") === "true";
  const siblings = childrenOf.get(parentId) ?? [];

  let coverPath: string | null = null;
  try {
    coverPath = await processOptionalCover(null, formData);
  } catch (error) {
    return { error: coverErrorMessage(error) ?? "A borítókép feldolgozása sikertelen." };
  }

  const created = await prisma.album.create({
    data: {
      slug: slugRaw,
      title,
      description,
      eventDate,
      published,
      sortOrder: siblings.length,
      parentId,
      parentKey: parentKeyOf(parentId),
      createdById: user.id,
      coverPath,
    },
  });

  await revalidateTree(created.id);
  return {};
}

export async function updateAlbum(formData: FormData): Promise<{ error?: string }> {
  const user = await requireStaff();
  const id = String(formData.get("id") ?? "");
  const album = await prisma.album.findUnique({ where: { id } });
  if (!album) return { error: "Az album nem található." };
  if (!canManageAlbum(user, album)) {
    return { error: "Csak a saját albumait szerkesztheti." };
  }

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Az album címe kötelező." };
  const parentId = parseParentId(String(formData.get("parentId") ?? String(album.parentId ?? "root")));
  const { byId, childrenOf } = await loadTree();

  if (parentId !== album.parentId) {
    const allowed = canMoveAlbum({ albumId: id, newParentId: parentId, byId, childrenOf });
    if (!allowed.ok) return { error: allowed.error };
    if (parentId && user.role !== "ADMIN") {
      const parent = byId.get(parentId);
      if (!parent || parent.createdById !== user.id) {
        return { error: "Csak a saját albumai alá helyezheti." };
      }
    }
  }

  const slugRaw = normalizeAlbumSlug(
    String(formData.get("slug") ?? "").trim() || slugifyAlbum(title) || album.slug,
  );
  if (!isValidEnglishSlug(slugRaw)) {
    return {
      error: "Az URL-azonosító angol kebab-case legyen (pl. sports-day), ékezet nélkül.",
    };
  }
  if (!parentId && isReservedAlbumSlug(slugRaw)) {
    return { error: "Ez az URL-azonosító foglalt egy beépített oldallal." };
  }
  if (!(await uniqueSlug(parentId, slugRaw, id))) {
    return { error: "Ebben a mappában ez az URL-azonosító már foglalt." };
  }

  const description = String(formData.get("description") ?? "").trim() || null;
  const eventDate = parseEventDate(String(formData.get("eventDate") ?? ""));
  const published = String(formData.get("published") ?? "") === "true";
  const parentChanged = parentId !== album.parentId;

  let coverPath: string | null;
  try {
    coverPath = await processOptionalCover(album.coverPath, formData);
  } catch (error) {
    return { error: coverErrorMessage(error) ?? "A borítókép feldolgozása sikertelen." };
  }

  const sortOrder = parentChanged
    ? (childrenOf.get(parentId) ?? []).filter((row) => row.id !== id).length
    : undefined;

  await prisma.album.update({
    where: { id },
    data: {
      slug: slugRaw,
      title,
      description,
      eventDate,
      published,
      parentId,
      parentKey: parentKeyOf(parentId),
      coverPath,
      ...(sortOrder !== undefined ? { sortOrder } : {}),
    },
  });

  if (parentChanged) {
    await reindexSiblings(album.parentId);
    await reindexSiblings(parentId);
  }

  await revalidateTree(id);
  return {};
}

async function reindexSiblings(parentId: string | null) {
  const remaining = await prisma.album.findMany({
    where: { parentKey: parentKeyOf(parentId) },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  if (remaining.length === 0) return;
  await prisma.$transaction(
    remaining.map((row, sortOrder) => prisma.album.update({ where: { id: row.id }, data: { sortOrder } })),
  );
}

export async function toggleAlbumPublished(formData: FormData): Promise<{ error?: string }> {
  const user = await requireStaff();
  const id = String(formData.get("id") ?? "");
  const album = await prisma.album.findUnique({ where: { id } });
  if (!album) return { error: "Az album nem található." };
  if (!canManageAlbum(user, album)) {
    return { error: "Csak a saját albumait teheti közzé." };
  }

  await prisma.album.update({
    where: { id },
    data: { published: !album.published },
  });

  await revalidateTree(id);
  return {};
}

export async function deleteAlbum(formData: FormData): Promise<{ error?: string }> {
  const user = await requireStaff();
  const id = String(formData.get("id") ?? "");
  const album = await prisma.album.findUnique({
    where: { id },
    include: { photos: true, _count: { select: { children: true } } },
  });
  if (!album) return { error: "Az album nem található." };
  if (!canManageAlbum(user, album)) {
    return { error: "Csak a saját albumait törölheti." };
  }
  if (album._count.children > 0) {
    return {
      error: "Az album csak akkor törölhető, ha nincs alalbuma. Először törölje vagy helyezze át a gyerekeket.",
    };
  }

  for (const photo of album.photos) {
    await deletePhotoFilesIfUnshared(photo);
  }
  deleteUploadFile(album.coverPath);
  await prisma.album.delete({ where: { id } });
  await reindexSiblings(album.parentId);
  await revalidateTree();
  return {};
}

export async function reorderAlbums(input: {
  albumId: string;
  parentId: string | null;
  orderedIds: string[];
}): Promise<{ error?: string }> {
  const user = await requireStaff();
  const album = await prisma.album.findUnique({ where: { id: input.albumId } });
  if (!album) return { error: "Az album nem található." };
  if (!canManageAlbum(user, album)) {
    return { error: "Csak a saját albumait rendezheti." };
  }

  const { byId, childrenOf } = await loadTree();
  const parentId = input.parentId;
  if (parentId !== album.parentId) {
    const allowed = canMoveAlbum({ albumId: album.id, newParentId: parentId, byId, childrenOf });
    if (!allowed.ok) return { error: allowed.error };
  }

  const previousParent = album.parentId;
  if (parentId !== album.parentId) {
    await prisma.album.update({
      where: { id: album.id },
      data: { parentId, parentKey: parentKeyOf(parentId) },
    });
  }

  const uniqueIds = [...new Set(input.orderedIds)];
  await prisma.$transaction(
    uniqueIds.map((id, sortOrder) =>
      prisma.album.update({
        where: { id },
        data: { sortOrder, parentId, parentKey: parentKeyOf(parentId) },
      }),
    ),
  );

  if (previousParent !== parentId) {
    await reindexSiblings(previousParent);
  }

  await revalidateTree(album.id);
  return {};
}
