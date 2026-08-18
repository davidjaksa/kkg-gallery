"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/session";
import { HOMEPAGE_ALBUM_COUNTS, parseHomepageAlbumCount, setHomepageAlbumCount } from "@/lib/settings";

export async function updateHomepageAlbumCount(formData: FormData): Promise<void> {
  await requireAdmin();
  const value = parseHomepageAlbumCount(String(formData.get("homepageAlbumCount") ?? ""));
  if (!(HOMEPAGE_ALBUM_COUNTS as readonly string[]).includes(value)) return;
  await setHomepageAlbumCount(value);
  revalidatePath("/");
  revalidatePath("/admin/settings");
}
