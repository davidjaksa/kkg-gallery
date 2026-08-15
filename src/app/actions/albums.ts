"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { deletePhotoFilesIfUnshared } from "@/lib/photo-files";
import { isValidEnglishSlug, normalizeAlbumSlug, slugifyAlbum } from "@/lib/slug";
import { albumPath, yearPath } from "@/lib/routes";
import { canManageAlbum, requireStaff } from "@/lib/session";

function parseEventDate(raw: string): Date | null {
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function revalidateAlbumPaths(yearSlug: string, albumSlug?: string) {
  revalidatePath("/");
  revalidatePath("/archive");
  revalidatePath(yearPath(yearSlug));
  if (albumSlug) revalidatePath(albumPath(yearSlug, albumSlug));
  revalidatePath("/admin/albums");
  revalidatePath("/admin");
}

export async function createAlbum(formData: FormData): Promise<{ error?: string }> {
  const user = await requireStaff();
  const yearId = String(formData.get("yearId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!yearId) return { error: "Válasszon tanévet." };
  if (!title) return { error: "Az album címe kötelező." };

  const year = await prisma.year.findUnique({ where: { id: yearId } });
  if (!year) return { error: "A tanév nem található." };

  const slugRaw = normalizeAlbumSlug(String(formData.get("slug") ?? "").trim() || slugifyAlbum(title), year.slug);
  const description = String(formData.get("description") ?? "").trim() || null;
  const eventDate = parseEventDate(String(formData.get("eventDate") ?? ""));
  const published = String(formData.get("published") ?? "") === "true";

  if (!isValidEnglishSlug(slugRaw)) {
    return {
      error: "Az URL-azonosító angol kebab-case legyen (pl. sports-day), ékezet és évszám nélkül.",
    };
  }

  const exists = await prisma.album.findFirst({ where: { yearId, slug: slugRaw } });
  if (exists) return { error: "Ebben a tanévben ez az URL-azonosító már foglalt." };

  const othersInYear = await prisma.album.count({ where: { yearId } });

  await prisma.album.create({
    data: {
      slug: slugRaw,
      title,
      description,
      eventDate,
      published,
      sortOrder: othersInYear,
      yearId,
      createdById: user.id,
    },
  });

  revalidateAlbumPaths(year.slug, slugRaw);
  return {};
}

export async function updateAlbum(formData: FormData): Promise<{ error?: string }> {
  const user = await requireStaff();
  const id = String(formData.get("id") ?? "");
  const album = await prisma.album.findUnique({ where: { id }, include: { year: true } });
  if (!album) return { error: "Az album nem található." };
  if (!canManageAlbum(user, album)) {
    return { error: "Csak a saját albumait szerkesztheti." };
  }

  const yearId = String(formData.get("yearId") ?? album.yearId);
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const eventDate = parseEventDate(String(formData.get("eventDate") ?? ""));
  const published = String(formData.get("published") ?? "") === "true";
  const yearChanged = yearId !== album.yearId;

  if (!title) return { error: "Az album címe kötelező." };

  const year = await prisma.year.findUnique({ where: { id: yearId } });
  if (!year) return { error: "A tanév nem található." };

  const slugRaw = normalizeAlbumSlug(
    String(formData.get("slug") ?? "").trim() || slugifyAlbum(title) || album.slug,
    year.slug,
  );
  if (!isValidEnglishSlug(slugRaw)) {
    return {
      error: "Az URL-azonosító angol kebab-case legyen (pl. sports-day), ékezet és évszám nélkül.",
    };
  }

  const clash = await prisma.album.findFirst({
    where: { yearId, slug: slugRaw, NOT: { id } },
  });
  if (clash) return { error: "Ebben a tanévben ez az URL-azonosító már foglalt." };

  const sortOrder = yearChanged
    ? await prisma.album.count({ where: { yearId, NOT: { id } } })
    : undefined;

  await prisma.album.update({
    where: { id },
    data: {
      slug: slugRaw,
      title,
      description,
      eventDate,
      published,
      yearId,
      ...(sortOrder !== undefined ? { sortOrder } : {}),
    },
  });

  revalidateAlbumPaths(year.slug, slugRaw);
  if (album.year.slug !== year.slug) {
    revalidatePath(yearPath(album.year.slug));
  }
  if (album.slug !== slugRaw || album.year.slug !== year.slug) {
    revalidatePath(albumPath(album.year.slug, album.slug));
  }
  return {};
}

export async function toggleAlbumPublished(formData: FormData): Promise<{ error?: string }> {
  const user = await requireStaff();
  const id = String(formData.get("id") ?? "");
  const album = await prisma.album.findUnique({ where: { id }, include: { year: true } });
  if (!album) return { error: "Az album nem található." };
  if (!canManageAlbum(user, album)) {
    return { error: "Csak a saját albumait teheti közzé." };
  }

  await prisma.album.update({
    where: { id },
    data: { published: !album.published },
  });

  revalidateAlbumPaths(album.year.slug, album.slug);
  return {};
}

export async function deleteAlbum(formData: FormData): Promise<{ error?: string }> {
  const user = await requireStaff();
  const id = String(formData.get("id") ?? "");
  const album = await prisma.album.findUnique({
    where: { id },
    include: { photos: true, year: true },
  });
  if (!album) return { error: "Az album nem található." };
  if (!canManageAlbum(user, album)) {
    return { error: "Csak a saját albumait törölheti." };
  }

  for (const photo of album.photos) {
    await deletePhotoFilesIfUnshared(photo);
  }

  await prisma.album.delete({ where: { id } });

  const remaining = await prisma.album.findMany({
    where: { yearId: album.yearId },
    orderBy: [{ sortOrder: "asc" }, { eventDate: "desc" }, { createdAt: "desc" }],
    select: { id: true },
  });
  await prisma.$transaction(
    remaining.map((row, sortOrder) =>
      prisma.album.update({ where: { id: row.id }, data: { sortOrder } }),
    ),
  );

  revalidateAlbumPaths(album.year.slug);
  return {};
}
