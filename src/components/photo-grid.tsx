"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { Lightbox, type LightboxPhoto } from "@/components/lightbox";
import { mediaUrl } from "@/lib/media";

const PAGE_SIZE = 12;

export function PhotoGrid({ photos }: { photos: LightboxPhoto[] }) {
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [active, setActive] = useState<number | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const shown = useMemo(() => photos.slice(0, visible), [photos, visible]);
  const hasMore = visible < photos.length;

  useEffect(() => {
    if (!hasMore) return;
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible((count) => Math.min(count + PAGE_SIZE, photos.length));
        }
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, photos.length, visible]);

  if (photos.length === 0) {
    return (
      <p className="font-body-md text-on-surface-variant">
        Ehhez az albumhoz még nincsenek közzétett fényképek.
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-gutter-gallery">
        {shown.map((photo, index) => {
          const src = mediaUrl(photo.thumbPath ?? photo.displayPath);
          return (
            <button
              key={photo.id}
              type="button"
              onClick={() => setActive(index)}
              className="group relative rounded-xl overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-shadow aspect-square"
            >
              {src && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={src}
                  alt={photo.filename}
                  loading={index < PAGE_SIZE ? "eager" : "lazy"}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              )}
              <div className="absolute inset-0 bg-tertiary/0 group-hover:bg-tertiary/40 transition-colors duration-300 flex items-center justify-center">
                <Icon
                  name="zoom_in"
                  className="text-on-primary text-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                />
              </div>
            </button>
          );
        })}
      </div>
      {hasMore ? (
        <div
          ref={sentinelRef}
          className="mt-stack-lg flex justify-center py-4 text-on-surface-variant font-body-md text-sm"
          aria-live="polite"
        >
          További fotók betöltése…
        </div>
      ) : null}
      {active !== null && (
        <Lightbox
          photos={photos}
          index={active}
          onClose={() => setActive(null)}
          onPrev={() => setActive((i) => (i === null ? 0 : (i + photos.length - 1) % photos.length))}
          onNext={() => setActive((i) => (i === null ? 0 : (i + 1) % photos.length))}
        />
      )}
    </>
  );
}
