import Link from "next/link";
import { Icon } from "@/components/icon";
import { formatCount } from "@/lib/dates";
import { mediaUrl } from "@/lib/media";
import { albumPath } from "@/lib/routes";
import { YEAR_SLUG_PATTERN } from "@/lib/years";

export function YearCard({
  slugs,
  name,
  albumCount,
  photoCount,
  cover,
}: {
  slugs: string[];
  name: string;
  albumCount: number;
  photoCount: number;
  cover: string | null;
}) {
  const src = mediaUrl(cover);
  const schoolYear = YEAR_SLUG_PATTERN.test(name);
  return (
    <Link
      href={albumPath(slugs)}
      className="group flex flex-col bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden hover-lift relative"
    >
      <div className="relative h-48 w-full bg-surface-container-low overflow-hidden">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 brick-pattern" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <h3
            className={`font-headline-lg text-headline-lg text-white font-bold truncate ${
              schoolYear ? "lowercase" : ""
            }`}
          >
            {name}
          </h3>
        </div>
      </div>
      <div className="p-4 flex justify-between items-center bg-surface-container-lowest lowercase">
        <div className="flex items-center gap-2 text-on-surface-variant">
          <Icon name="photo_library" className="text-[18px]" />
          <span className="font-label-sm text-label-sm">{formatCount(albumCount)} album</span>
        </div>
        <div className="flex items-center gap-2 text-on-surface-variant">
          <Icon name="image" className="text-[18px]" />
          <span className="font-label-sm text-label-sm">{formatCount(photoCount)} kép</span>
        </div>
      </div>
    </Link>
  );
}
