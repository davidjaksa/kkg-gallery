import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { ensureUploadDirs, resolveUploadPath } from "@/lib/paths";
import { ensureAdmin } from "@/lib/seed";
import { processCover, processMovedPhoto } from "@/lib/sharp";
import { slugifyEnglish, slugifyAlbum } from "@/lib/slug";
import { parentKeyOf } from "@/lib/albums";
import { formatSchoolYear } from "@/lib/years";

const PHOTOS_DIR = path.join(process.cwd(), "photos");
const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png"]);
const SKIP_NAMES = new Set([
  ".DS_Store",
  ".listing",
  "_catalog.json",
  "_download.log",
  "_failures.txt",
]);
const CONCURRENCY = 4;

type DiscoveredAlbum = {
  title: string;
  dir: string;
  files: string[];
};

type DiscoveredYear = {
  folderName: string;
  isCustom: boolean;
  startYear: number | null;
  slug: string;
  label: string | null;
  albums: DiscoveredAlbum[];
};

function parseArgs(argv: string[]) {
  let dryRun = false;
  let publish = false;
  let yearFilter: string | null = null;
  for (const arg of argv) {
    if (arg === "--dry-run") dryRun = true;
    else if (arg === "--publish") publish = true;
    else if (arg.startsWith("--year=")) yearFilter = arg.slice("--year=".length).trim() || null;
  }
  return { dryRun, publish, yearFilter };
}

function foldHungarian(input: string): string {
  return input
    .replaceAll("ő", "o")
    .replaceAll("Ő", "o")
    .replaceAll("ű", "u")
    .replaceAll("Ű", "u");
}

function slugify(input: string): string {
  return slugifyEnglish(foldHungarian(input));
}

function mimeForExt(ext: string): "image/jpeg" | "image/png" {
  return ext === ".png" ? "image/png" : "image/jpeg";
}

function matchesYearFilter(year: DiscoveredYear, filter: string): boolean {
  const needle = filter.toLowerCase();
  return (
    year.folderName.toLowerCase() === needle ||
    year.slug.toLowerCase() === needle ||
    year.label?.toLowerCase() === needle
  );
}

async function listDir(dir: string) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries.filter((entry) => !SKIP_NAMES.has(entry.name) && !entry.name.startsWith("."));
}

async function collectImages(dir: string): Promise<string[]> {
  const out: string[] = [];
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop()!;
    let entries;
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (SKIP_NAMES.has(entry.name) || entry.name.startsWith(".")) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (!IMAGE_EXT.has(ext)) continue;
      out.push(full);
    }
  }
  out.sort((a, b) => a.localeCompare(b, "hu"));
  return out;
}

function relativeFilename(albumDir: string, file: string): string {
  return path.relative(albumDir, file).split(path.sep).join("/");
}

function hashFile(file: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    createReadStream(file)
      .on("data", (chunk) => hash.update(chunk))
      .on("end", () => resolve(hash.digest("hex")))
      .on("error", reject);
  });
}

async function unlinkQuiet(file: string) {
  await fs.unlink(file).catch(() => undefined);
}

async function pruneEmptyDirs(dir: string, keepRoot = true) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (SKIP_NAMES.has(entry.name) || entry.name.startsWith(".")) continue;
    await pruneEmptyDirs(path.join(dir, entry.name), false);
  }
  if (keepRoot) return;
  const leftover = await fs.readdir(dir).catch(() => null);
  if (!leftover) return;
  const meaningful = leftover.filter((name) => !SKIP_NAMES.has(name) && !name.startsWith("."));
  if (meaningful.length > 0) return;
  await fs.rm(dir, { recursive: true, force: true });
}

async function discover(): Promise<DiscoveredYear[]> {
  const top = await listDir(PHOTOS_DIR);
  const years: DiscoveredYear[] = [];

  for (const entry of top) {
    if (!entry.isDirectory()) continue;
    const folderName = entry.name;
    const dir = path.join(PHOTOS_DIR, folderName);
    const isOrdinary = /^\d{4}$/.test(folderName);
    const children = await listDir(dir);
    const subdirs = children.filter((child) => child.isDirectory());
    const albums: DiscoveredAlbum[] = [];

    if (isOrdinary || subdirs.length > 0) {
      for (const albumEntry of subdirs) {
        const albumDir = path.join(dir, albumEntry.name);
        const files = await collectImages(albumDir);
        if (files.length === 0) continue;
        albums.push({ title: albumEntry.name, dir: albumDir, files });
      }
    } else {
      const files = await collectImages(dir);
      if (files.length === 0) continue;
      albums.push({ title: folderName, dir, files });
    }

    if (albums.length === 0) continue;

    albums.sort((a, b) => a.title.localeCompare(b.title, "hu"));

    if (isOrdinary) {
      const startYear = Number(folderName);
      const slug = formatSchoolYear(startYear);
      years.push({
        folderName,
        isCustom: false,
        startYear,
        slug,
        label: null,
        albums,
      });
    } else {
      const slug = slugify(folderName) || "year";
      years.push({
        folderName,
        isCustom: true,
        startYear: null,
        slug,
        label: folderName,
        albums,
      });
    }
  }

  years.sort((a, b) => {
    if (a.isCustom !== b.isCustom) return a.isCustom ? -1 : 1;
    if (a.isCustom) return (a.label ?? a.slug).localeCompare(b.label ?? b.slug, "hu");
    return (b.startYear ?? 0) - (a.startYear ?? 0);
  });

  return years;
}

function uniqueAlbumSlug(title: string, used: Set<string>, yearSlug?: string): string {
  const base = slugifyAlbum(title, yearSlug) || "album";
  let slug = base.slice(0, 80);
  let n = 2;
  while (used.has(slug)) {
    const suffix = `-${n}`;
    slug = base.slice(0, 80 - suffix.length) + suffix;
    n += 1;
  }
  used.add(slug);
  return slug;
}

async function pool<T>(items: T[], concurrency: number, fn: (item: T, index: number) => Promise<void>) {
  if (items.length === 0) return;
  let next = 0;
  async function worker() {
    while (true) {
      const index = next;
      next += 1;
      if (index >= items.length) return;
      await fn(items[index]!, index);
    }
  }
  const size = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: size }, () => worker()));
}

async function assignRootSortOrder() {
  const roots = await prisma.album.findMany({
    where: { parentKey: "" },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  await prisma.$transaction(
    roots.map((album, sortOrder) => prisma.album.update({ where: { id: album.id }, data: { sortOrder } })),
  );
}

async function main() {
  const { dryRun, publish, yearFilter } = parseArgs(process.argv.slice(2));

  try {
    await fs.access(PHOTOS_DIR);
  } catch {
    console.error(`Photos folder not found: ${PHOTOS_DIR}`);
    process.exit(1);
  }

  let years = await discover();
  if (yearFilter) {
    years = years.filter((year) => matchesYearFilter(year, yearFilter));
    if (years.length === 0) {
      console.error(`No matching year folder for --year=${yearFilter}`);
      process.exit(1);
    }
  }

  const albumCount = years.reduce((sum, year) => sum + year.albums.length, 0);
  const photoCount = years.reduce(
    (sum, year) => sum + year.albums.reduce((inner, album) => inner + album.files.length, 0),
    0,
  );

  console.log(
    `${dryRun ? "[dry-run] " : ""}Found ${years.length} years, ${albumCount} albums, ${photoCount} photos${
      publish ? " (publish)" : " (drafts unless --publish)"
    }`,
  );
  for (const year of years) {
    const n = year.albums.reduce((sum, album) => sum + album.files.length, 0);
    console.log(
      `  ${year.isCustom ? "custom" : "year"} ${year.folderName} → ${year.slug} (${year.albums.length} albums, ${n} photos)`,
    );
  }

  if (dryRun) return;

  ensureUploadDirs();
  await ensureAdmin();
  const admin =
    (await prisma.user.findFirst({
      where: { role: "ADMIN" },
      orderBy: { createdAt: "asc" },
    })) ?? (await prisma.user.findFirst({ orderBy: { createdAt: "asc" } }));
  if (!admin) {
    console.error("No admin user. Set ADMIN_EMAIL and ADMIN_PASSWORD in .env, then retry.");
    process.exit(1);
  }

  const stats = { years: 0, albums: 0, photos: 0, reused: 0, skipped: 0, failed: 0 };

  type StoredPaths = { originalPath: string; displayPath: string; thumbPath: string };
  const pathsByHash = new Map<string, StoredPaths>();
  const inflightByHash = new Map<string, Promise<StoredPaths>>();
  for (const photo of await prisma.photo.findMany({
    where: { contentHash: { not: null }, status: "READY" },
    select: { contentHash: true, originalPath: true, displayPath: true, thumbPath: true },
  })) {
    if (photo.contentHash) {
      pathsByHash.set(photo.contentHash, {
        originalPath: photo.originalPath,
        displayPath: photo.displayPath,
        thumbPath: photo.thumbPath,
      });
    }
  }

  const unhashed = await prisma.photo.findMany({
    where: { contentHash: null, status: "READY" },
    select: { id: true, originalPath: true, displayPath: true, thumbPath: true },
  });
  for (const photo of unhashed) {
    try {
      const hash = await hashFile(resolveUploadPath(photo.originalPath));
      await prisma.photo.update({ where: { id: photo.id }, data: { contentHash: hash } });
      if (!pathsByHash.has(hash)) {
        pathsByHash.set(hash, {
          originalPath: photo.originalPath,
          displayPath: photo.displayPath,
          thumbPath: photo.thumbPath,
        });
      }
    } catch {
      // original missing; skip hash backfill
    }
  }

  function storedPathsForHash(hash: string, factory: () => Promise<StoredPaths>): Promise<StoredPaths> {
    const cached = pathsByHash.get(hash);
    if (cached) return Promise.resolve(cached);
    let pending = inflightByHash.get(hash);
    if (!pending) {
      pending = factory().then((paths) => {
        pathsByHash.set(hash, paths);
        inflightByHash.delete(hash);
        return paths;
      });
      inflightByHash.set(hash, pending);
    }
    return pending;
  }

  for (const year of years) {
    const existingRoot = await prisma.album.findFirst({
      where: { parentKey: "", slug: year.slug },
    });
    const yearRow =
      existingRoot ??
      (await prisma.album.create({
        data: {
          slug: year.slug,
          title: year.label ?? year.slug,
          published: publish,
          parentId: null,
          parentKey: "",
          createdById: admin.id,
        },
      }));
    if (!existingRoot) stats.years += 1;

    let albumSort = (
      await prisma.album.aggregate({
        where: { parentKey: parentKeyOf(yearRow.id) },
        _max: { sortOrder: true },
      })
    )._max.sortOrder;
    if (albumSort == null) albumSort = -1;

    const usedAlbumSlugs = new Set(
      (await prisma.album.findMany({ where: { parentKey: parentKeyOf(yearRow.id) }, select: { slug: true } })).map(
        (album) => album.slug,
      ),
    );

    let firstPhotoPath: string | null = null;

    for (const album of year.albums) {
      let albumRow = await prisma.album.findFirst({
        where: { parentId: yearRow.id, title: album.title },
      });
      if (!albumRow) {
        const slug = uniqueAlbumSlug(album.title, usedAlbumSlugs, year.slug);
        albumSort += 1;
        albumRow = await prisma.album.create({
          data: {
            slug,
            title: album.title,
            published: publish,
            sortOrder: albumSort,
            parentId: yearRow.id,
            parentKey: parentKeyOf(yearRow.id),
            createdById: admin.id,
          },
        });
        stats.albums += 1;
      } else {
        usedAlbumSlugs.add(albumRow.slug);
      }

      const existingPhotos = await prisma.photo.findMany({
        where: { albumId: albumRow.id },
        select: { filename: true, contentHash: true },
      });
      const existingNames = new Set(existingPhotos.map((photo) => photo.filename));
      const existingHashes = new Set(
        existingPhotos.map((photo) => photo.contentHash).filter((hash): hash is string => Boolean(hash)),
      );

      const toImport = album.files.map((file) => ({
        file,
        filename: relativeFilename(album.dir, file),
      }));

      const albumId = albumRow.id;
      await pool(toImport, CONCURRENCY, async (item) => {
        try {
          if (existingNames.has(item.filename)) {
            await unlinkQuiet(item.file);
            stats.skipped += 1;
            return;
          }

          const hash = await hashFile(item.file);
          if (existingHashes.has(hash)) {
            await unlinkQuiet(item.file);
            stats.skipped += 1;
            return;
          }

          const id = randomUUID();
          const ext = path.extname(item.file).toLowerCase();
          const wasKnown = pathsByHash.has(hash) || inflightByHash.has(hash);
          const stored = await storedPathsForHash(hash, () =>
            processMovedPhoto({ id, sourcePath: item.file, mime: mimeForExt(ext) }),
          );
          await unlinkQuiet(item.file);
          if (wasKnown) stats.reused += 1;

          await prisma.photo.create({
            data: {
              id,
              filename: item.filename,
              originalPath: stored.originalPath,
              displayPath: stored.displayPath,
              thumbPath: stored.thumbPath,
              contentHash: hash,
              status: "READY",
              albumId,
              uploadedById: admin.id,
            },
          });
          existingNames.add(item.filename);
          existingHashes.add(hash);
          if (!firstPhotoPath) firstPhotoPath = stored.originalPath;
          stats.photos += 1;
          if ((stats.photos + stats.reused) % 50 === 0) {
            console.log(`  imported ${stats.photos} photos (${stats.reused} reused)…`);
          }
        } catch (error) {
          stats.failed += 1;
          console.error(`  failed ${item.filename}:`, error instanceof Error ? error.message : error);
        }
      });
    }

    if (!yearRow.coverPath && firstPhotoPath) {
      const buffer = await fs.readFile(resolveUploadPath(firstPhotoPath));
      const coverPath = await processCover({ id: yearRow.id, buffer });
      await prisma.album.update({ where: { id: yearRow.id }, data: { coverPath } });
    }
  }

  await assignRootSortOrder();
  await pruneEmptyDirs(PHOTOS_DIR);

  console.log(
    `Done. years=${stats.years} albums=${stats.albums} photos=${stats.photos} reused=${stats.reused} skipped=${stats.skipped} failed=${stats.failed}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
