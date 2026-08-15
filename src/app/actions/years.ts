"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { deleteUploadFile, ensureUploadDirs } from "@/lib/paths";
import { requireStaff } from "@/lib/session";
import { processCover, MAX_UPLOAD_BYTES, sniffImageMime } from "@/lib/sharp";
import { isValidEnglishSlug, slugifyEnglish } from "@/lib/slug";
import { isReservedYearSlug, yearPath } from "@/lib/routes";
import { formatSchoolYear, parseStartYearInput } from "@/lib/years";

type Placement = {
  referenceYearId: string;
  position: "before" | "after";
};

function parsePlacement(formData: FormData): Placement | null {
  const referenceYearId = String(formData.get("referenceYearId") ?? "").trim();
  const positionRaw = String(formData.get("position") ?? "");
  if (!referenceYearId) return null;
  if (positionRaw !== "before" && positionRaw !== "after") return null;
  return { referenceYearId, position: positionRaw };
}

async function applyYearPlacement(
  yearId: string,
  placement: Placement | null,
  startYear: number | null,
) {
  const others = await prisma.year.findMany({
    where: { NOT: { id: yearId } },
    orderBy: [{ sortOrder: "asc" }, { startYear: "desc" }],
    select: { id: true, startYear: true },
  });

  const ids = others.map((year) => year.id);
  if (placement) {
    const refIndex = ids.indexOf(placement.referenceYearId);
    if (refIndex === -1) {
      ids.push(yearId);
    } else {
      const insertAt = placement.position === "before" ? refIndex : refIndex + 1;
      ids.splice(insertAt, 0, yearId);
    }
  } else if (startYear != null) {
    let insertAt = ids.length;
    for (let i = 0; i < others.length; i++) {
      const otherStart = others[i]?.startYear;
      if (otherStart != null && otherStart < startYear) {
        insertAt = i;
        break;
      }
    }
    ids.splice(insertAt, 0, yearId);
  } else {
    ids.push(yearId);
  }

  await prisma.$transaction(
    ids.map((id, sortOrder) => prisma.year.update({ where: { id }, data: { sortOrder } })),
  );
}

function revalidateYearPaths(slug: string, previousSlug?: string) {
  revalidatePath("/");
  revalidatePath("/archive");
  revalidatePath(yearPath(slug));
  revalidatePath("/admin/years");
  revalidatePath("/admin/albums");
  if (previousSlug && previousSlug !== slug) {
    revalidatePath(yearPath(previousSlug));
  }
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

export async function createYear(formData: FormData): Promise<{ error?: string; slug?: string }> {
  await requireStaff();
  const isCustom = formData.get("isCustom") === "on";
  const placement = isCustom ? parsePlacement(formData) : null;

  let slug: string;
  let startYear: number | null = null;
  let label: string | null = null;

  if (isCustom) {
    label = String(formData.get("label") ?? "").trim() || null;
    slug = String(formData.get("slug") ?? "").trim() || slugifyEnglish(label ?? "");
    if (!label) return { error: "Az egyedi név kötelező." };
    if (!isValidEnglishSlug(slug)) {
      return {
        error: "Az URL-azonosító angol kebab-case legyen (pl. school-history), ékezet nélkül.",
      };
    }
    if (isReservedYearSlug(slug)) {
      return { error: "Ez az URL-azonosító foglalt egy beépített oldallal." };
    }
  } else {
    startYear = parseStartYearInput(String(formData.get("startYear") ?? ""));
    if (startYear === null) {
      return { error: "Adjon meg egy érvényes kezdőévet (pl. 2026)." };
    }
    slug = formatSchoolYear(startYear);
  }

  const othersCount = await prisma.year.count();
  if (isCustom && othersCount > 0 && !placement) {
    return { error: "Válasszon egy évet, és adja meg, hogy elé vagy mögé kerüljön." };
  }

  const existing = await prisma.year.findFirst({
    where: {
      OR: [{ slug }, ...(startYear != null ? [{ startYear }] : [])],
    },
  });
  if (existing) {
    return { error: isCustom ? "Ez az URL-azonosító már foglalt." : `A ${slug} tanév már létezik.` };
  }

  if (placement) {
    const reference = await prisma.year.findUnique({ where: { id: placement.referenceYearId } });
    if (!reference) return { error: "A referenciaév nem található." };
  }

  let coverPath: string | null;
  try {
    coverPath = await processOptionalCover(null, formData);
  } catch (error) {
    return { error: coverErrorMessage(error) ?? "A borítókép feldolgozása sikertelen." };
  }

  const year = await prisma.year.create({
    data: {
      slug,
      startYear,
      label,
      isCustom,
      sortOrder: othersCount,
      coverPath,
    },
  });

  await applyYearPlacement(year.id, placement, isCustom ? null : startYear);

  revalidateYearPaths(slug);
  return { slug };
}

export async function updateYear(formData: FormData): Promise<{ error?: string }> {
  await requireStaff();
  const id = String(formData.get("id") ?? "");
  const year = await prisma.year.findUnique({ where: { id } });
  if (!year) return { error: "A tanév nem található." };

  const isCustom = formData.get("isCustom") === "on";
  const placement = isCustom ? parsePlacement(formData) : null;

  let slug: string;
  let startYear: number | null = null;
  let label: string | null = null;

  if (isCustom) {
    label = String(formData.get("label") ?? "").trim() || null;
    slug = String(formData.get("slug") ?? "").trim() || slugifyEnglish(label ?? "") || year.slug;
    if (!label) return { error: "Az egyedi név kötelező." };
    if (!isValidEnglishSlug(slug)) {
      return {
        error: "Az URL-azonosító angol kebab-case legyen (pl. school-history), ékezet nélkül.",
      };
    }
    if (isReservedYearSlug(slug)) {
      return { error: "Ez az URL-azonosító foglalt egy beépített oldallal." };
    }
  } else {
    startYear = parseStartYearInput(String(formData.get("startYear") ?? ""));
    if (startYear === null) {
      return { error: "Adjon meg egy érvényes kezdőévet (pl. 2026)." };
    }
    slug = formatSchoolYear(startYear);
  }

  const clash = await prisma.year.findFirst({
    where: {
      OR: [{ slug }, ...(startYear != null ? [{ startYear }] : [])],
      NOT: { id },
    },
  });
  if (clash) {
    return { error: isCustom ? "Ez az URL-azonosító már foglalt." : `A ${slug} tanév már létezik.` };
  }

  if (placement) {
    const reference = await prisma.year.findFirst({
      where: { id: placement.referenceYearId, NOT: { id } },
    });
    if (!reference) return { error: "A referenciaév nem található." };
  }

  let coverPath: string | null;
  try {
    coverPath = await processOptionalCover(year.coverPath, formData);
  } catch (error) {
    return { error: coverErrorMessage(error) ?? "A borítókép feldolgozása sikertelen." };
  }
  const startYearChanged = startYear !== year.startYear;
  const becameNormal = year.isCustom && !isCustom;

  await prisma.year.update({
    where: { id },
    data: { slug, startYear, label, isCustom, coverPath },
  });

  if (placement) {
    await applyYearPlacement(id, placement, null);
  } else if (!isCustom && (startYearChanged || becameNormal)) {
    await applyYearPlacement(id, null, startYear);
  }

  revalidateYearPaths(slug, year.slug);
  return {};
}

export async function deleteYear(formData: FormData): Promise<{ error?: string }> {
  await requireStaff();
  const id = String(formData.get("id") ?? "");
  const year = await prisma.year.findUnique({
    where: { id },
    include: { _count: { select: { albums: true } } },
  });
  if (!year) return { error: "A tanév nem található." };
  if (year._count.albums > 0) {
    return {
      error: "A tanév csak akkor törölhető, ha nincs hozzá album. Először törölje vagy helyezze át az albumokat.",
    };
  }

  await prisma.year.delete({ where: { id } });
  deleteUploadFile(year.coverPath);

  const remaining = await prisma.year.findMany({
    orderBy: [{ sortOrder: "asc" }, { startYear: "desc" }],
    select: { id: true },
  });
  await prisma.$transaction(
    remaining.map((row, sortOrder) =>
      prisma.year.update({ where: { id: row.id }, data: { sortOrder } }),
    ),
  );

  revalidateYearPaths(year.slug);
  return {};
}
