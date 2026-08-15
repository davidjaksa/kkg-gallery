"use client";

import { useCallback, useEffect, useRef } from "react";
import { Icon } from "@/components/icon";
import { mediaUrl } from "@/lib/media";

export type LightboxPhoto = {
  id: string;
  filename: string;
  displayPath: string;
  thumbPath?: string;
};

const SWIPE_THRESHOLD = 50;

export function Lightbox({
  photos,
  index,
  onClose,
  onPrev,
  onNext,
}: {
  photos: LightboxPhoto[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const startX = useRef<number | null>(null);
  const swiped = useRef(false);
  const photo = photos[index];

  const onKey = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") onPrev();
      if (event.key === "ArrowRight") onNext();
    },
    [onClose, onPrev, onNext],
  );

  useEffect(() => {
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onKey]);

  function onPointerDown(event: React.PointerEvent) {
    if (event.pointerType === "mouse") return;
    startX.current = event.clientX;
  }

  function onPointerUp(event: React.PointerEvent) {
    if (startX.current == null) return;
    const dx = event.clientX - startX.current;
    startX.current = null;
    if (Math.abs(dx) < SWIPE_THRESHOLD || photos.length < 2) return;
    swiped.current = true;
    if (dx > 0) onPrev();
    else onNext();
  }

  function onBackdropClick() {
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    onClose();
  }

  if (!photo) return null;
  const src = mediaUrl(photo.displayPath);
  const control =
    "absolute text-white hover:text-primary-fixed flex items-center justify-center min-h-11 min-w-11 z-10";

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center h-[100dvh] px-0 xl:pl-[max(0.75rem,env(safe-area-inset-left))] xl:pr-[max(0.75rem,env(safe-area-inset-right))]"
      role="dialog"
      aria-modal="true"
      aria-label={photo.filename}
      onClick={onBackdropClick}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        onPointerDown={(e) => e.stopPropagation()}
        className={`${control} top-[max(0.75rem,env(safe-area-inset-top))] right-[max(0.75rem,env(safe-area-inset-right))]`}
        aria-label="Bezárás"
      >
        <Icon name="close" className="text-3xl" />
      </button>
      {photos.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className={`${control} left-[max(0.25rem,env(safe-area-inset-left))]`}
          aria-label="Előző"
        >
          <Icon name="chevron_left" className="text-3xl xl:text-5xl" />
        </button>
      )}
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={photo.filename}
          className="w-full max-h-[calc(100dvh-8rem)] object-contain xl:w-auto xl:max-w-[min(100%,calc(100vw-4.5rem))]"
          onClick={(e) => e.stopPropagation()}
        />
      )}
      {photos.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className={`${control} right-[max(0.25rem,env(safe-area-inset-right))]`}
          aria-label="Következő"
        >
          <Icon name="chevron_right" className="text-3xl xl:text-5xl" />
        </button>
      )}
      <p className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 w-[min(calc(100%-2rem),36rem)] px-4 text-center font-label-sm text-label-sm text-white/80 truncate">
        {index + 1} / {photos.length}
      </p>
    </div>
  );
}
