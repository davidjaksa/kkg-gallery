import type { Metadata } from "next";
import { AlbumCard } from "@/components/album-card";
import { YearCard } from "@/components/year-card";
import { searchPublic, yearStats } from "@/lib/queries";
import { yearDisplayName } from "@/lib/years";

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
  const { years, albums } = await searchPublic(query);

  return (
    <main className="flex-grow px-margin-page py-12 max-w-7xl mx-auto w-full space-y-12">
      <div>
        <h1 className="font-headline-xl text-headline-xl text-primary mb-4">Keresés</h1>
        <form className="max-w-xl">
          <input
            name="q"
            defaultValue={query}
            placeholder="Keresés év, albumcím vagy leírás szerint..."
            className="w-full bg-surface border border-outline-variant rounded-full py-3 px-5 focus:outline-none focus:ring-2 focus:ring-primary font-body-md text-base"
          />
        </form>
      </div>

      {!query ? (
        <p className="font-body-md text-on-surface-variant">Adjon meg egy keresőkifejezést.</p>
      ) : years.length === 0 && albums.length === 0 ? (
        <p className="font-body-md text-on-surface-variant">Nincs találat a(z) „{query}” kifejezésre.</p>
      ) : (
        <>
          {years.length > 0 && (
            <section>
              <h2 className="font-headline-lg text-headline-lg mb-6">Tanévek</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter-gallery">
                {years.map((year) => {
                  const stats = yearStats(year);
                  return (
                    <YearCard
                      key={year.id}
                      slug={year.slug}
                      name={yearDisplayName(year)}
                      albumCount={stats.albumCount}
                      photoCount={stats.photoCount}
                      cover={stats.cover}
                    />
                  );
                })}
              </div>
            </section>
          )}
          {albums.length > 0 && (
            <section>
              <h2 className="font-headline-lg text-headline-lg mb-6">Albumok</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter-gallery">
                {albums.map((album) => (
                  <AlbumCard
                    key={album.id}
                    yearSlug={album.year.slug}
                    slug={album.slug}
                    title={album.title}
                    photoCount={album._count.photos}
                    cover={album.photos[0]?.thumbPath ?? null}
                    eventDate={album.eventDate}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
