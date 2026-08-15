import { notFound, permanentRedirect } from "next/navigation";
import { getAlbumByLegacySlug } from "@/lib/queries";
import { albumPath } from "@/lib/routes";

export const dynamic = "force-dynamic";

export default async function LegacyAlbumRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const album = await getAlbumByLegacySlug(slug);
  if (!album) notFound();
  permanentRedirect(albumPath(album.year.slug, album.slug));
}
