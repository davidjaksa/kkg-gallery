import Link from "next/link";
import { Icon } from "@/components/icon";
import { albumPath, yearPath } from "@/lib/routes";

type SidebarYear = {
  slug: string;
  name: string;
  albums: { slug: string; title: string }[];
};

function AlbumLinks({
  year,
  activeYearSlug,
  activeSlug,
}: {
  year: SidebarYear;
  activeYearSlug: string;
  activeSlug: string;
}) {
  return (
    <>
      {year.albums.map((album) => {
        const active = album.slug === activeSlug && year.slug === activeYearSlug;
        return (
          <Link
            key={`${year.slug}-${album.slug}`}
            href={albumPath(year.slug, album.slug)}
            className={
              active
                ? "py-2 px-4 border-l-2 border-primary ml-2 text-primary font-medium flex items-center justify-between bg-surface-container-low rounded-r min-h-11"
                : "py-2 px-4 border-l-2 border-surface-container ml-2 text-secondary hover:text-primary transition-colors flex items-center justify-between group min-h-11"
            }
          >
            <span className="truncate">{album.title}</span>
            <Icon
              name="chevron_right"
              className={`text-xs shrink-0 ${active ? "" : "opacity-0 group-hover:opacity-100"}`}
            />
          </Link>
        );
      })}
    </>
  );
}

function YearHeading({ year }: { year: SidebarYear }) {
  return (
    <Link
      href={yearPath(year.slug)}
      className="mb-1 px-2 text-label-sm text-on-surface-variant uppercase tracking-wider flex items-center gap-2 font-headline-md min-h-11"
    >
      <Icon name="folder_open" className="text-sm" />
      {year.name}
    </Link>
  );
}

function AlbumNav({
  years,
  activeYearSlug,
  activeSlug,
}: {
  years: SidebarYear[];
  activeYearSlug: string;
  activeSlug: string;
}) {
  return (
    <nav className="flex flex-col gap-1">
      {years.map((year) => (
        <div key={year.slug} className="mt-4 first:mt-0">
          <YearHeading year={year} />
          <AlbumLinks year={year} activeYearSlug={activeYearSlug} activeSlug={activeSlug} />
        </div>
      ))}
    </nav>
  );
}

export function AlbumSidebar({
  years,
  activeYearSlug,
  activeSlug,
}: {
  years: SidebarYear[];
  activeYearSlug: string;
  activeSlug: string;
}) {
  return (
    <aside className="hidden xl:block w-64 flex-shrink-0">
      <div className="bg-surface-container-lowest rounded-xl border border-surface-container p-6 shadow-sm sticky top-24">
        <AlbumNav years={years} activeYearSlug={activeYearSlug} activeSlug={activeSlug} />
      </div>
    </aside>
  );
}

export function AlbumNavMobile({
  years,
  activeYearSlug,
  activeSlug,
}: {
  years: SidebarYear[];
  activeYearSlug: string;
  activeSlug: string;
}) {
  return (
    <details className="xl:hidden mb-stack-lg bg-surface-container-lowest rounded-xl border border-surface-container p-4 shadow-sm">
      <summary className="font-headline-md text-on-surface cursor-pointer min-h-11 flex items-center justify-between gap-2 list-none [&::-webkit-details-marker]:hidden">
        <span className="flex items-center">
          <Icon name="photo_album" className="text-sm mr-2" />
          Albumok
        </span>
        <Icon name="expand_more" className="text-sm" />
      </summary>
      <nav className="flex flex-col gap-1 mt-4">
        {years.map((year) =>
          year.slug === activeYearSlug ? (
            <div key={year.slug}>
              <YearHeading year={year} />
              <AlbumLinks year={year} activeYearSlug={activeYearSlug} activeSlug={activeSlug} />
            </div>
          ) : (
            <details key={year.slug} className="mt-2">
              <summary className="px-2 text-label-sm text-on-surface-variant uppercase tracking-wider flex items-center gap-2 font-headline-md min-h-11 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                <Icon name="folder_open" className="text-sm" />
                {year.name}
              </summary>
              <AlbumLinks year={year} activeYearSlug={activeYearSlug} activeSlug={activeSlug} />
            </details>
          ),
        )}
      </nav>
    </details>
  );
}
