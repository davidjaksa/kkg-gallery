import { prisma } from "@/lib/db";

export const HOMEPAGE_ALBUM_COUNTS = ["3", "6", "9", "12", "all"] as const;
export type HomepageAlbumCount = (typeof HOMEPAGE_ALBUM_COUNTS)[number];

const HOMEPAGE_KEY = "homepageAlbumCount";
const DEFAULT_COUNT: HomepageAlbumCount = "3";

export function parseHomepageAlbumCount(raw: string | null | undefined): HomepageAlbumCount {
  if (raw && (HOMEPAGE_ALBUM_COUNTS as readonly string[]).includes(raw)) {
    return raw as HomepageAlbumCount;
  }
  return DEFAULT_COUNT;
}

export async function getHomepageAlbumCount(): Promise<HomepageAlbumCount> {
  const row = await prisma.setting.findUnique({ where: { key: HOMEPAGE_KEY } });
  return parseHomepageAlbumCount(row?.value);
}

export async function setHomepageAlbumCount(value: HomepageAlbumCount) {
  await prisma.setting.upsert({
    where: { key: HOMEPAGE_KEY },
    create: { key: HOMEPAGE_KEY, value },
    update: { value },
  });
}

export function homepageTake(count: HomepageAlbumCount): number | undefined {
  if (count === "all") return undefined;
  return Number(count);
}
