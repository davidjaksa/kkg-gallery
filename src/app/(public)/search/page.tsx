import type { Metadata } from "next";
import { AlbumCard } from "@/components/album-card";
import { YearCard } from "@/components/year-card";
import { albumStats, searchPublic, getAllPublicRootAlbums } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Keresés",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const { albums } = await searchPublic(query);
  const graph = await getAllPublicRootAlbums();

  const roots = albums.filter((album) => !album.parentId);
  const nested = albums.filter((album) => album.parentId);

  return (
    <main className="flex-grow px-margin-page py-12 max-w-7xl mx-auto w-full space-y-12">
      <div>
        <h1 className="font-headline-xl text-headline-xl text-primary mb-4">Keresés</h1>
        <form className="max-w-xl">
          <input
            name="q"
            defaultValue={query}
            placeholder="Keresés albumcím vagy leírás szerint..."
            className="w-full bg-surface border border-outline-variant rounded-full py-3 px-5 focus:outline-none focus:ring-2 focus:ring-primary font-body-md text-base"
          />
        </form>
      </div>

      {!query ? (
        <p className="font-body-md text-on-surface-variant">Adjon meg egy keresőkifejezést.</p>
      ) : albums.length === 0 ? (
        <p className="font-body-md text-on-surface-variant">Nincs találat a(z) „{query}” kifejezésre.</p>
      ) : (
        <>
          {roots.length > 0 && (
            <section>
              <h2 className="font-headline-lg text-headline-lg mb-6">Főalbumok</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter-gallery">
                {roots.map((album) => {
                  const stats = albumStats(album, graph.albums);
                  return (
                    <YearCard
                      key={album.id}
                      slugs={album.slugs}
                      name={album.title}
                      albumCount={stats.albumCount}
                      photoCount={stats.photoCount}
                      cover={stats.cover}
                    />
                  );
                })}
              </div>
            </section>
          )}
          {nested.length > 0 && (
            <section>
              <h2 className="font-headline-lg text-headline-lg mb-6">Albumok</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter-gallery">
                {nested.map((album) => {
                  const stats = albumStats(album, graph.albums);
                  return (
                    <AlbumCard
                      key={album.id}
                      slugs={album.slugs}
                      title={album.title}
                      photoCount={stats.photoCount}
                      cover={stats.cover}
                      eventDate={album.eventDate}
                    />
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
