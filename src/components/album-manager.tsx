"use client";

import { useCallback, useEffect, useState } from "react";
import { createAlbum, deleteAlbum, toggleAlbumPublished, updateAlbum } from "@/app/actions/albums";
import { Icon } from "@/components/icon";
import { slugifyAlbum } from "@/lib/slug";
import { albumPath } from "@/lib/routes";

type YearOption = { id: string; name: string; slug: string };
type AlbumRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  eventDate: string | null;
  published: boolean;
  yearId: string;
  yearName: string;
  yearSlug: string;
  photoCount: number;
  canManage: boolean;
};

const fieldClass =
  "w-full p-3 rounded-lg border border-outline-variant bg-surface font-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none";

export function AlbumManager({ years, albums }: { years: YearOption[]; albums: AlbumRow[] }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<AlbumRow | null>(null);
  const closeCreate = useCallback(() => setCreateOpen(false), []);
  const closeEdit = useCallback(() => setEditing(null), []);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-headline-lg text-headline-lg mb-2">Albumok</h1>
          <p className="font-body-md text-on-surface-variant">
            Minden fénykép pontosan egy albumhoz tartozik. A slug a névből képződik, amíg nem módosítja.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="bg-primary text-on-primary px-5 py-2 rounded-full font-medium flex items-center gap-2 shadow-sm hover:opacity-90 shrink-0 self-start"
        >
          <Icon name="create_new_folder" className="text-[20px]" />
          Új album
        </button>
      </div>

      <div className="space-y-4">
        {albums.length === 0 && <p className="font-body-md text-secondary">Még nincs album.</p>}
        {albums.map((album) => (
          <AlbumEditCard key={album.id} album={album} onEdit={() => setEditing(album)} />
        ))}
      </div>

      {createOpen && (
        <AlbumDialog title="Új album" onClose={closeCreate}>
          <AlbumForm years={years} onCancel={closeCreate} onSuccess={closeCreate} />
        </AlbumDialog>
      )}
      {editing && (
        <AlbumDialog title="Album szerkesztése" onClose={closeEdit}>
          <AlbumForm years={years} album={editing} onCancel={closeEdit} onSuccess={closeEdit} />
        </AlbumDialog>
      )}
    </div>
  );
}

function AlbumDialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] bg-on-surface/50 flex items-start justify-center overflow-y-auto p-4 py-6 md:py-12 max-h-[100dvh]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="album-dialog-title"
      onClick={onClose}
    >
      <div
        className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 md:p-6 w-full max-w-2xl shadow-xl relative max-h-[100dvh] overflow-y-auto"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-6">
          <h3 id="album-dialog-title" className="font-headline-md text-headline-md text-on-surface">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-on-surface-variant hover:text-primary min-h-11 min-w-11 flex items-center justify-center rounded-full hover:bg-surface-container-low shrink-0"
            aria-label="Bezárás"
          >
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function AlbumForm({
  years,
  album,
  onCancel,
  onSuccess,
}: {
  years: YearOption[];
  album?: AlbumRow;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [yearId, setYearId] = useState(album?.yearId ?? "");
  const [title, setTitle] = useState(album?.title ?? "");
  const [slug, setSlug] = useState(album?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(album));
  const selectedYearSlug = years.find((year) => year.id === yearId)?.slug;

  const suggestSlug = (nextTitle: string) => {
    if (slugTouched) return;
    setSlug(slugifyAlbum(nextTitle, selectedYearSlug));
  };

  return (
    <form
      action={async (formData) => {
        const result = album ? await updateAlbum(formData) : await createAlbum(formData);
        setError(result.error ?? null);
        if (!result.error) onSuccess();
      }}
      className="space-y-4"
    >
      {album && <input type="hidden" name="id" value={album.id} />}

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-headline-md mb-2">Tanév</label>
          <select
            name="yearId"
            required
            value={yearId}
            onChange={(event) => setYearId(event.target.value)}
            className={fieldClass}
          >
            <option value="">Válasszon tanévet…</option>
            {years.map((year) => (
              <option key={year.id} value={year.id}>
                {year.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-headline-md mb-2">Név</label>
          <input
            name="title"
            required
            value={title}
            onChange={(event) => {
              const value = event.target.value;
              setTitle(value);
              suggestSlug(value);
            }}
            className={fieldClass}
          />
        </div>
        <div>
          <label className="block text-sm font-headline-md mb-2">Slug</label>
          <input
            name="slug"
            value={slug}
            onChange={(event) => {
              setSlugTouched(true);
              setSlug(event.target.value);
            }}
            placeholder="oszi-kirandulas"
            required
            className={`${fieldClass} font-label-sm`}
          />
          <p className="mt-1 font-body-md text-secondary text-sm">
            {selectedYearSlug && slug
              ? `Nyilvános cím: ${albumPath(selectedYearSlug, slug)}`
              : "Automatikusan a névből képződik, amíg nem módosítja."}
          </p>
        </div>
        <div>
          <label className="block text-sm font-headline-md mb-2">Esemény dátuma</label>
          <input
            name="eventDate"
            type="date"
            defaultValue={album?.eventDate ? album.eventDate.slice(0, 10) : ""}
            className={fieldClass}
          />
        </div>
        <div>
          <label className="block text-sm font-headline-md mb-2">Állapot</label>
          <select
            name="published"
            defaultValue={album?.published ? "true" : "false"}
            className={fieldClass}
          >
            <option value="false">Piszkozat</option>
            <option value="true">Közzétéve</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-headline-md mb-2">Leírás</label>
        <textarea
          name="description"
          rows={3}
          defaultValue={album?.description ?? ""}
          className={fieldClass}
        />
      </div>
      {error && <p className="text-error text-sm">{error}</p>}
      <div className="flex flex-wrap gap-3 justify-end pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2 rounded-full border border-outline-variant font-medium hover:bg-surface-container-low"
        >
          Mégse
        </button>
        <button type="submit" className="bg-primary text-on-primary px-5 py-2 rounded-full font-medium">
          {album ? "Változtatások mentése" : "Album létrehozása"}
        </button>
      </div>
    </form>
  );
}

function AlbumEditCard({ album, onEdit }: { album: AlbumRow; onEdit: () => void }) {
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 md:p-6 space-y-4">
      <div className="flex flex-wrap justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-headline-md text-on-surface truncate">{album.title}</h3>
          <p className="font-label-sm text-label-sm text-secondary break-all">
            {album.yearName} · <span className="lowercase">{albumPath(album.yearSlug, album.slug)}</span> ·{" "}
            {album.photoCount}{" "}
            kép
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {album.canManage && (
            <>
              <button
                type="button"
                onClick={onEdit}
                className="px-4 py-2 min-h-11 rounded-full border border-outline-variant text-sm font-medium hover:bg-surface-container-low"
              >
                Szerkesztés
              </button>
              <form
                action={async (formData) => {
                  const result = await toggleAlbumPublished(formData);
                  setError(result.error ?? null);
                }}
              >
                <input type="hidden" name="id" value={album.id} />
                <button
                  type="submit"
                  className="px-4 py-2 min-h-11 rounded-full border border-outline-variant text-sm font-medium hover:bg-surface-container-low"
                >
                  {album.published ? "Visszavonás" : "Közzététel"}
                </button>
              </form>
              <form
                action={async (formData) => {
                  const result = await deleteAlbum(formData);
                  setError(result.error ?? null);
                }}
              >
                <input type="hidden" name="id" value={album.id} />
                <button type="submit" className="px-4 py-2 min-h-11 rounded-full text-error text-sm">
                  Törlés
                </button>
              </form>
            </>
          )}
        </div>
      </div>
      {error && <p className="text-error text-sm">{error}</p>}
    </div>
  );
}
