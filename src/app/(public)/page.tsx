import Link from "next/link";
import { Icon } from "@/components/icon";
import { YearCard } from "@/components/year-card";
import { getLatestYears, yearStats } from "@/lib/queries";
import { yearDisplayName } from "@/lib/years";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const years = await getLatestYears(3);

  return (
    <main>
      <section className="relative bg-surface-container-high py-12 md:py-20 border-b border-outline-variant flex flex-col items-center justify-center text-center overflow-hidden">
        <div className="absolute inset-0 brick-pattern opacity-50 pointer-events-none" />
        <div className="relative z-10 w-full max-w-7xl mx-auto px-margin-page">
          <div className="max-w-3xl mx-auto">
            <h1 className="font-headline-xl text-headline-xl text-on-surface mb-stack-md">
              Pillanatok, amelyek iskolánk történetét mesélik.
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant mb-stack-lg max-w-2xl mx-auto">
              Nézd meg a Könyvesesek életét képekben!
            </p>
            <form action="/search" className="relative max-w-md mx-auto w-full">
              <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
              <input
                name="q"
                className="w-full bg-surface border border-outline-variant rounded-full py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-body-md text-on-surface"
                placeholder="Keresés..."
                type="search"
              />
            </form>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-20 bg-surface-container-lowest">
        <div className="max-w-7xl mx-auto px-margin-page">
          <div className="flex justify-between items-end mb-stack-lg">
            <h2 className="font-headline-lg text-headline-lg text-on-surface">Tanévek</h2>
          </div>
          {years.length === 0 ? (
            <p className="font-body-md text-on-surface-variant">
              Még nincsenek közzétett tanévek. Jelentkezzen be a feltöltéshez.
            </p>
          ) : (
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
          )}
          <div className="mt-stack-lg flex justify-center">
            <Link
              href="/archive"
              className="bg-primary text-on-primary px-8 py-4 rounded-full font-label-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-md w-full sm:w-auto"
            >
              <Icon name="history" />
              Teljes Archívum Megtekintése
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
