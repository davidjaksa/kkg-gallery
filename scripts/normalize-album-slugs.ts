import { prisma } from "@/lib/db";
import { isValidEnglishSlug, normalizeAlbumSlug } from "@/lib/slug";

function nextUniqueSlug(desired: string, used: Set<string>): string {
  let base = desired;
  if (!isValidEnglishSlug(base)) base = "album";
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

async function main() {
  const albums = await prisma.album.findMany({
    include: { year: { select: { slug: true } } },
    orderBy: { createdAt: "asc" },
  });

  const usedByYear = new Map<string, Set<string>>();
  let changed = 0;

  for (const album of albums) {
    const used = usedByYear.get(album.yearId) ?? new Set<string>();
    usedByYear.set(album.yearId, used);
    const next = nextUniqueSlug(normalizeAlbumSlug(album.slug, album.year.slug), used);
    if (next === album.slug) continue;
    await prisma.album.update({ where: { id: album.id }, data: { slug: next } });
    changed += 1;
    console.log(`  /${album.year.slug}/${album.slug} → /${album.year.slug}/${next}`);
  }

  console.log(`Updated ${changed} album slugs`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
