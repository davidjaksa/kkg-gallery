import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlbumCard } from "@/components/album-card";
import { AlbumNavMobile, AlbumSidebar } from "@/components/album-sidebar";
import { Icon } from "@/components/icon";
import { PhotoGrid } from "@/components/photo-grid";
import { formatCount, formatHuDate } from "@/lib/dates";
import { albumStats, getAlbumSidebar, getAllPublicRootAlbums, getPublicAlbumByPath } from "@/lib/queries";
import { isReservedAlbumSlug, MAX_ALBUM_DEPTH } from "@/lib/routes";
import { YEAR_SLUG_PATTERN } from "@/lib/years";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ albumPath: string[] }>;
}): Promise<Metadata> {
  const { albumPath: slugs } = await params;
  const data = await getPublicAlbumByPath(slugs ?? []);
  return { title: data?.album.title ?? "Album" };
}

export default async function NestedAlbumPage({
  params,
}: {
  params: Promise<{ albumPath: string[] }>;
}) {
  const { albumPath: slugs } = await params;
  const path = slugs ?? [];
  if (path.length === 0 || path.length > MAX_ALBUM_DEPTH) notFound();
  if (isReservedAlbumSlug(path[0] ?? "")) notFound();

  const data = await getPublicAlbumByPath(path);
  if (!data) notFound();

  const sidebar = await getAlbumSidebar();
  const { albums: allAlbums } = await getAllPublicRootAlbums();
  const { album, children, photos, crumbs } = data;
  const schoolYear = !album.parentId && YEAR_SLUG_PATTERN.test(album.title);
  const parentHref = crumbs.length > 1 ? crumbs[crumbs.length - 2]?.href : "/archive";
  const parentLabel = crumbs.length > 1 ? crumbs[crumbs.length - 2]?.title : "archívumhoz";

  return (
    <main className="flex-grow w-full max-w-7xl mx-auto px-margin-page py-stack-lg flex flex-col xl:flex-row gap-gutter-gallery">
      {album.parentId ? <AlbumSidebar nodes={sidebar} activeId={album.id} /> : null}
      <section className="flex-grow min-w-0">
        <div className="mb-stack-lg pb-stack-md border-b border-outline-variant">
          <Link
            href={parentHref ?? "/archive"}
            className="inline-flex items-center text-secondary hover:text-primary text-sm mb-4 transition-colors"
          >
            <Icon name="arrow_back" className="mr-1 text-sm" />
            Vissza a {parentLabel}
          </Link>
          <h1
            className={`font-headline-xl text-headline-xl text-on-surface mb-2 font-bold ${
              schoolYear ? "lowercase" : ""
            }`}
          >
            {album.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-secondary text-label-sm tracking-wider font-headline-md">
            {album.eventDate && (
              <span className="flex items-center gap-1">
                <Icon name="calendar_today" className="text-sm" />
                {formatHuDate(album.eventDate)}
              </span>
            )}
            {photos.length > 0 && (
              <span className="flex items-center gap-1">
                <Icon name="photo_library" className="text-sm" />
                {formatCount(photos.length)} fotó
              </span>
            )}
          </div>
          {album.description && (
            <p className="mt-4 text-on-surface-variant max-w-3xl font-body-md">{album.description}</p>
          )}
        </div>

        {album.parentId ? <AlbumNavMobile nodes={sidebar} activeId={album.id} /> : null}

        {children.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter-gallery mb-stack-lg">
            {children.map((child) => {
              const stats = albumStats(child, allAlbums);
              return (
                <AlbumCard
                  key={child.id}
                  slugs={[...path, child.slug]}
                  title={child.title}
                  photoCount={stats.photoCount}
                  cover={stats.cover}
                  eventDate={child.eventDate}
                />
              );
            })}
          </div>
        )}

        {photos.length > 0 && (
          <PhotoGrid
            photos={photos.map((photo) => ({
              id: photo.id,
              filename: photo.filename,
              displayPath: photo.displayPath,
              thumbPath: photo.thumbPath,
            }))}
          />
        )}

        {children.length === 0 && photos.length === 0 && (
          <p className="font-body-md text-on-surface-variant">Ebben az albumban még nincs közzétett tartalom.</p>
        )}
      </section>
    </main>
  );
}
