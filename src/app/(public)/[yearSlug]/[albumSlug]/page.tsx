import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlbumNavMobile, AlbumSidebar } from "@/components/album-sidebar";
import { Icon } from "@/components/icon";
import { PhotoGrid } from "@/components/photo-grid";
import { formatCount, formatHuDate } from "@/lib/dates";
import { getAlbumSidebar, getPublicAlbum } from "@/lib/queries";
import { yearPath } from "@/lib/routes";
import { yearDisplayName } from "@/lib/years";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ yearSlug: string; albumSlug: string }>;
}): Promise<Metadata> {
  const { yearSlug, albumSlug } = await params;
  const album = await getPublicAlbum(yearSlug, albumSlug);
  return { title: album?.title ?? "Album" };
}

export default async function AlbumPage({
  params,
}: {
  params: Promise<{ yearSlug: string; albumSlug: string }>;
}) {
  const { yearSlug, albumSlug } = await params;
  const album = await getPublicAlbum(yearSlug, albumSlug);
  if (!album) notFound();
  const years = await getAlbumSidebar();

  return (
    <main className="flex-grow w-full max-w-7xl mx-auto px-margin-page py-stack-lg flex flex-col xl:flex-row gap-gutter-gallery">
      <AlbumSidebar years={years} activeYearSlug={album.year.slug} activeSlug={album.slug} />
      <section className="flex-grow min-w-0">
        <div className="mb-stack-lg pb-stack-md border-b border-outline-variant">
          <Link
            href={yearPath(album.year.slug)}
            className="inline-flex items-center text-secondary hover:text-primary text-sm mb-4 transition-colors"
          >
            <Icon name="arrow_back" className="mr-1 text-sm" />
            Vissza a {yearDisplayName(album.year)} évhez
          </Link>
          <h1 className="font-headline-xl text-headline-xl text-on-surface mb-2 font-bold">{album.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-secondary text-label-sm tracking-wider font-headline-md">
            {album.eventDate && (
              <span className="flex items-center gap-1">
                <Icon name="calendar_today" className="text-sm" />
                {formatHuDate(album.eventDate)}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Icon name="photo_library" className="text-sm" />
              {formatCount(album.photos.length)} fotó
            </span>
          </div>
          {album.description && (
            <p className="mt-4 text-on-surface-variant max-w-3xl font-body-md">{album.description}</p>
          )}
        </div>
        <AlbumNavMobile years={years} activeYearSlug={album.year.slug} activeSlug={album.slug} />
        <PhotoGrid
          photos={album.photos.map((photo) => ({
            id: photo.id,
            filename: photo.filename,
            displayPath: photo.displayPath,
            thumbPath: photo.thumbPath,
          }))}
        />
      </section>
    </main>
  );
}
