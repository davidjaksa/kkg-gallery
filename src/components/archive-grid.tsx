import { YearCard } from "@/components/year-card";

type YearItem = {
  slug: string;
  name: string;
  albumCount: number;
  photoCount: number;
  cover: string | null;
};

export function ArchiveGrid({ years }: { years: YearItem[] }) {
  return (
    <>
      <div className="mb-12">
        <h2 className="font-headline-xl text-headline-xl text-primary mb-2">Archívum</h2>
        <p className="text-body-lg font-body-lg text-on-surface-variant">
          Böngésszen az elmúlt tanévek eseményei és galériái között.
        </p>
      </div>
      {years.length === 0 ? (
        <p className="font-body-md text-on-surface-variant">Még nincsenek közzétett tanévek.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter-gallery">
          {years.map((year) => (
            <YearCard key={year.slug} {...year} />
          ))}
        </div>
      )}
    </>
  );
}
