import Link from "next/link";
import { Icon } from "@/components/icon";
import { formatCount, formatHuDate } from "@/lib/dates";
import { mediaUrl } from "@/lib/media";
import { albumPath } from "@/lib/routes";

export function AlbumCard({
  slugs,
  title,
  photoCount,
  cover,
  eventDate,
}: {
  slugs: string[];
  title: string;
  photoCount: number;
  cover: string | null;
  eventDate?: Date | null;
}) {
  const src = mediaUrl(cover);
  return (
    <Link
      href={albumPath(slugs)}
      className="group flex flex-col bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden hover-lift"
    >
      <div className="relative aspect-video w-full bg-surface-container-low overflow-hidden">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 brick-pattern flex items-center justify-center">
            <Icon name="photo_album" className="text-4xl text-outline" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <h3 className="font-headline-md text-white font-semibold truncate">{title}</h3>
        </div>
      </div>
      <div className="p-4 flex justify-between items-center bg-surface-container-lowest">
        <div className="flex items-center gap-2 text-on-surface-variant">
          <Icon name="image" className="text-[18px]" />
          <span className="font-label-sm text-label-sm lowercase">{formatCount(photoCount)} kép</span>
        </div>
        {eventDate && (
          <span className="font-label-sm text-label-sm text-on-surface-variant truncate">
            {formatHuDate(eventDate)}
          </span>
        )}
      </div>
    </Link>
  );
}
