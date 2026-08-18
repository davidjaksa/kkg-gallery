import type { Metadata } from "next";
import { ArchiveGrid } from "@/components/archive-grid";
import { albumStats, getAllPublicRootAlbums } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Archívum",
};

export default async function ArchivePage() {
  const { albums, roots } = await getAllPublicRootAlbums();
  const items = roots.map((album) => {
    const stats = albumStats(album, albums);
    return { slugs: [album.slug], name: album.title, ...stats };
  });

  return (
    <main className="flex-grow px-margin-page py-12 max-w-7xl mx-auto w-full">
      <ArchiveGrid years={items} />
    </main>
  );
}
