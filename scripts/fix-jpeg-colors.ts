import { prisma } from "@/lib/db";
import { reprocessStoredJpeg } from "@/lib/sharp";

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

async function main() {
  const yearSlug = argValue("year") ?? "2014-15";
  const albumSlug = argValue("album") ?? "bolondb";
  const album = await prisma.album.findFirst({
    where: { slug: albumSlug, parent: { slug: yearSlug } },
    include: {
      photos: {
        select: {
          id: true,
          originalPath: true,
          displayPath: true,
          thumbPath: true,
        },
      },
    },
  });

  if (!album) {
    throw new Error(`Album not found: /${yearSlug}/${albumSlug}`);
  }

  const byOriginal = new Map<string, (typeof album.photos)[number]>();
  for (const photo of album.photos) {
    if (!byOriginal.has(photo.originalPath)) byOriginal.set(photo.originalPath, photo);
  }

  console.log(`Regenerating ${album.photos.length} photos (${byOriginal.size} files) in /${yearSlug}/${album.slug}`);

  let changed = 0;
  let failed = 0;
  let n = 0;
  for (const photo of byOriginal.values()) {
    n += 1;
    try {
      const result = await reprocessStoredJpeg(photo);
      await prisma.photo.updateMany({
        where: { originalPath: photo.originalPath },
        data: { contentHash: result.contentHash },
      });
      if (result.changed) changed += 1;
      if (n % 25 === 0) console.log(`  ${n}/${byOriginal.size}…`);
    } catch (error) {
      failed += 1;
      console.error(`  failed ${photo.originalPath}:`, error instanceof Error ? error.message : error);
    }
  }

  console.log(`Done. files=${byOriginal.size} originalsRewritten=${changed} failed=${failed}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
