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
  const match = await getAlbumByLegacySlug(slug);
  if (!match) notFound();
  permanentRedirect(albumPath(match.slugs));
}
