import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlbumCard } from "@/components/album-card";
import { Icon } from "@/components/icon";
import { getPublicYear } from "@/lib/queries";
import { isReservedYearSlug } from "@/lib/routes";
import { YEAR_SLUG_PATTERN, yearDisplayName } from "@/lib/years";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ yearSlug: string }>;
}): Promise<Metadata> {
  const { yearSlug } = await params;
  const year = await getPublicYear(yearSlug);
  return { title: year ? yearDisplayName(year) : yearSlug };
}

export default async function YearPage({ params }: { params: Promise<{ yearSlug: string }> }) {
  const { yearSlug } = await params;
  if (isReservedYearSlug(yearSlug)) notFound();
  const year = await getPublicYear(yearSlug);
  if (!year) notFound();
  const name = yearDisplayName(year);
  const schoolYear = !year.isCustom && YEAR_SLUG_PATTERN.test(name);

  return (
    <main className="flex-grow px-margin-page py-12 max-w-7xl mx-auto w-full">
      <Link
        href="/archive"
        className="inline-flex items-center text-secondary hover:text-primary text-sm mb-6 transition-colors"
      >
        <Icon name="arrow_back" className="mr-1 text-sm" />
        Vissza az archívumhoz
      </Link>
      <h1
        className={`font-headline-xl text-headline-xl text-on-surface mb-2 ${
          schoolYear ? "lowercase" : ""
        }`}
      >
        {name}
      </h1>
      <p className="font-body-lg text-on-surface-variant mb-stack-lg">
        {year.isCustom ? `Albumok: ${name}` : `Albumok a ${name} tanévből.`}
      </p>
      {year.albums.length === 0 ? (
        <p className="font-body-md text-on-surface-variant">Ebben a tanévben még nincs közzétett album.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter-gallery">
          {year.albums.map((album) => (
            <AlbumCard
              key={album.id}
              yearSlug={year.slug}
              slug={album.slug}
              title={album.title}
              photoCount={album._count.photos}
              cover={album.photos[0]?.thumbPath ?? null}
              eventDate={album.eventDate}
            />
          ))}
        </div>
      )}
    </main>
  );
}
