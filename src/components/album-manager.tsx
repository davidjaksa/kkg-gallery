"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCenter,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createAlbum, deleteAlbum, reorderAlbums, toggleAlbumPublished, updateAlbum } from "@/app/actions/albums";
import { Icon } from "@/components/icon";
import { MAX_ALBUM_DEPTH, albumPath } from "@/lib/routes";
import { descendantIds, indexAlbums, slugPathOf } from "@/lib/albums";
import { slugifyAlbum } from "@/lib/slug";

export type AlbumTreeRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  eventDate: string | null;
  published: boolean;
  parentId: string | null;
  sortOrder: number;
  photoCount: number;
  childCount: number;
  canManage: boolean;
  coverPath: string | null;
  createdById: string;
};

const fieldClass =
  "w-full p-3 rounded-lg border border-outline-variant bg-surface font-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none";

const collision: CollisionDetection = (args) => {
  const pointer = pointerWithin(args);
  if (pointer.length) return pointer;
  return closestCenter(args);
};

export function AlbumManager({ albums }: { albums: AlbumTreeRow[] }) {
  const [createParentId, setCreateParentId] = useState<string | null | undefined>(undefined);
  const [editing, setEditing] = useState<AlbumTreeRow | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(albums.filter((a) => !a.parentId).map((a) => a.id)));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { byId, childrenOf } = useMemo(() => indexAlbums(albums), [albums]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
  );

  const roots = useMemo(() => {
    const visibleIds = new Set(albums.map((album) => album.id));
    return albums.filter((album) => !album.parentId || !visibleIds.has(album.parentId));
  }, [albums]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const albumId = String(active.id);
    const overId = String(over.id);
    const album = byId.get(albumId);
    if (!album || !album.canManage) return;

    let parentId: string | null;
    let orderedIds: string[];

    if (overId.startsWith("nest-")) {
      parentId = overId.slice(5);
      if (parentId === albumId) return;
      if (descendantIds(albumId, childrenOf).includes(parentId)) return;
      const siblings = (childrenOf.get(parentId) ?? []).map((row) => row.id).filter((id) => id !== albumId);
      orderedIds = [...siblings, albumId];
    } else {
      const overAlbum = byId.get(overId);
      if (!overAlbum) return;
      parentId = overAlbum.parentId;
      const siblings = (childrenOf.get(parentId) ?? []).map((row) => row.id).filter((id) => id !== albumId);
      const overIndex = siblings.indexOf(overId);
      if (overIndex === -1) siblings.push(albumId);
      else siblings.splice(overIndex, 0, albumId);
      orderedIds = siblings;
    }

    const result = await reorderAlbums({ albumId, parentId, orderedIds });
    setError(result.error ?? null);
  }

  const closeCreate = useCallback(() => setCreateParentId(undefined), []);
  const closeEdit = useCallback(() => setEditing(null), []);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-headline-lg text-headline-lg mb-2">Albumok</h1>
          <p className="font-body-md text-on-surface-variant">
            Egy fa, maximum {MAX_ALBUM_DEPTH} szint. A sorrendet a fogóponttal húzva állíthatja; másik albumra ejtve
            alalbummá válik.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateParentId(null)}
          className="bg-primary text-on-primary px-5 py-2 rounded-full font-medium flex items-center gap-2 shadow-sm hover:opacity-90 shrink-0 self-start min-h-11"
        >
          <Icon name="create_new_folder" className="text-[20px]" />
          Új album
        </button>
      </div>

      {error && <p className="text-error text-sm mb-4">{error}</p>}

      {roots.length === 0 ? (
        <p className="font-body-md text-secondary">Még nincs album.</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={collision}
          onDragStart={({ active }) => setActiveId(String(active.id))}
          onDragEnd={onDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <SortableContext items={albums.map((album) => album.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {roots.map((album) => (
                <TreeNode
                  key={album.id}
                  album={album}
                  albums={albums}
                  depth={1}
                  expanded={expanded}
                  onToggle={toggle}
                  onEdit={setEditing}
                  onCreateChild={(id) => setCreateParentId(id)}
                  activeId={activeId}
                />
              ))}
            </div>
          </SortableContext>
          <DragOverlay>
            {activeId ? (
              <div className="bg-surface-container-lowest border border-primary rounded-xl px-4 py-3 shadow-lg font-body-md">
                {byId.get(activeId)?.title}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {createParentId !== undefined && (
        <AlbumDialog title="Új album" onClose={closeCreate}>
          <AlbumForm
            albums={albums}
            parentId={createParentId}
            onCancel={closeCreate}
            onSuccess={closeCreate}
          />
        </AlbumDialog>
      )}
      {editing && (
        <AlbumDialog title="Album szerkesztése" onClose={closeEdit}>
          <AlbumForm albums={albums} album={editing} onCancel={closeEdit} onSuccess={closeEdit} />
        </AlbumDialog>
      )}
    </div>
  );
}

function TreeNode({
  album,
  albums,
  depth,
  expanded,
  onToggle,
  onEdit,
  onCreateChild,
  activeId,
}: {
  album: AlbumTreeRow;
  albums: AlbumTreeRow[];
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onEdit: (album: AlbumTreeRow) => void;
  onCreateChild: (id: string) => void;
  activeId: string | null;
}) {
  const kids = albums.filter((row) => row.parentId === album.id);
  const open = expanded.has(album.id);
  return (
    <div>
      <SortableRow
        album={album}
        albums={albums}
        depth={depth}
        hasChildren={kids.length > 0}
        open={open}
        onToggle={() => onToggle(album.id)}
        onEdit={() => onEdit(album)}
        onCreateChild={() => onCreateChild(album.id)}
      />
      {open && kids.length > 0 && activeId !== album.id ? (
        <div className="mt-2 space-y-2">
          {kids.map((child) => (
            <TreeNode
              key={child.id}
              album={child}
              albums={albums}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              onEdit={onEdit}
              onCreateChild={onCreateChild}
              activeId={activeId}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SortableRow({
  album,
  albums,
  depth,
  hasChildren,
  open,
  onToggle,
  onEdit,
  onCreateChild,
}: {
  album: AlbumTreeRow;
  albums: AlbumTreeRow[];
  depth: number;
  hasChildren: boolean;
  open: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onCreateChild: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: album.id,
    disabled: !album.canManage,
  });
  const { setNodeRef: setNestRef, isOver } = useDroppable({
    id: `nest-${album.id}`,
    disabled: !album.canManage || depth >= MAX_ALBUM_DEPTH,
  });
  const { byId } = indexAlbums(albums);
  const href = albumPath(slugPathOf(album.id, byId));
  const [error, setError] = useState<string | null>(null);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    marginLeft: Math.min((depth - 1) * 16, 64),
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        setNestRef(node);
      }}
      style={style}
      className={`bg-surface-container-lowest border rounded-xl p-3 md:p-4 ${
        isOver ? "border-primary" : "border-outline-variant"
      }`}
    >
      <div className="flex items-start gap-2">
        {album.canManage ? (
          <button
            type="button"
            className="min-h-11 min-w-11 flex items-center justify-center rounded-lg text-secondary hover:bg-surface-container-low cursor-grab active:cursor-grabbing touch-none"
            aria-label="Átrendezés"
            {...attributes}
            {...listeners}
          >
            <Icon name="drag_indicator" />
          </button>
        ) : (
          <span className="min-w-11" />
        )}
        {hasChildren ? (
          <button
            type="button"
            onClick={onToggle}
            className="min-h-11 min-w-11 flex items-center justify-center rounded-lg hover:bg-surface-container-low"
            aria-label={open ? "Összecsukás" : "Kinyitás"}
          >
            <Icon name={open ? "expand_more" : "chevron_right"} />
          </button>
        ) : (
          <span className="min-w-11" />
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-headline-md text-on-surface truncate">{album.title}</h3>
          <p className="font-label-sm text-label-sm text-secondary break-all">
            <span className="lowercase">{href}</span> · {album.photoCount} kép
            {album.childCount ? ` · ${album.childCount} alalbum` : ""}
            {album.published ? "" : " · piszkozat"}
          </p>
          {error && <p className="text-error text-sm mt-1">{error}</p>}
        </div>
        {album.canManage && (
          <div className="flex flex-wrap gap-2 justify-end">
            {depth < MAX_ALBUM_DEPTH && (
              <button
                type="button"
                onClick={onCreateChild}
                className="px-3 py-2 min-h-11 rounded-full border border-outline-variant text-sm font-medium hover:bg-surface-container-low"
              >
                Alalbum
              </button>
            )}
            <button
              type="button"
              onClick={onEdit}
              className="px-3 py-2 min-h-11 rounded-full border border-outline-variant text-sm font-medium hover:bg-surface-container-low"
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
                className="px-3 py-2 min-h-11 rounded-full border border-outline-variant text-sm font-medium hover:bg-surface-container-low"
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
              <button type="submit" className="px-3 py-2 min-h-11 rounded-full text-error text-sm">
                Törlés
              </button>
            </form>
          </div>
        )}
      </div>
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
      onClick={onClose}
    >
      <div
        className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 md:p-6 w-full max-w-2xl shadow-xl relative max-h-[100dvh] overflow-y-auto"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-6">
          <h3 className="font-headline-md text-headline-md text-on-surface">{title}</h3>
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

function parentOptions(albums: AlbumTreeRow[], excludeId?: string) {
  const { childrenOf } = indexAlbums(albums);
  const blocked = excludeId ? new Set([excludeId, ...descendantIds(excludeId, childrenOf)]) : new Set<string>();
  const options: { id: string; label: string; depth: number }[] = [];

  function walk(parentId: string | null, depth: number) {
    if (depth > MAX_ALBUM_DEPTH) return;
    for (const album of childrenOf.get(parentId) ?? []) {
      if (blocked.has(album.id)) continue;
      const indent = "— ".repeat(Math.max(0, depth - 1));
      options.push({ id: album.id, label: `${indent}${album.title}`, depth });
      walk(album.id, depth + 1);
    }
  }
  walk(null, 1);
  return options.filter((option) => option.depth < MAX_ALBUM_DEPTH);
}

function AlbumForm({
  albums,
  album,
  parentId,
  onCancel,
  onSuccess,
}: {
  albums: AlbumTreeRow[];
  album?: AlbumTreeRow;
  parentId?: string | null;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(album?.title ?? "");
  const [slug, setSlug] = useState(album?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(album));
  const [selectedParent, setSelectedParent] = useState(album?.parentId ?? parentId ?? "");
  const parents = parentOptions(albums, album?.id);
  const { byId } = indexAlbums(albums);
  const previewSlugs = album
    ? slugPathOf(album.id, byId)
    : selectedParent
      ? [...slugPathOf(selectedParent, byId), slug || "…"]
      : [slug || "…"];

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
      <div>
        <label className="block text-sm font-headline-md mb-2">Szülő</label>
        <select
          name="parentId"
          value={selectedParent || "root"}
          onChange={(event) => setSelectedParent(event.target.value === "root" ? "" : event.target.value)}
          className={fieldClass}
        >
          <option value="root">Felső szint</option>
          {parents.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-headline-md mb-2">Név</label>
          <input
            name="title"
            required
            value={title}
            onChange={(event) => {
              const value = event.target.value;
              setTitle(value);
              if (!slugTouched) setSlug(slugifyAlbum(value));
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
            required
            className={`${fieldClass} font-label-sm`}
          />
          <p className="mt-1 font-body-md text-secondary text-sm lowercase">{albumPath(previewSlugs)}</p>
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
          <select name="published" defaultValue={album?.published ? "true" : "false"} className={fieldClass}>
            <option value="false">Piszkozat</option>
            <option value="true">Közzétéve</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-headline-md mb-2">Leírás</label>
        <textarea name="description" rows={3} defaultValue={album?.description ?? ""} className={fieldClass} />
      </div>
      <div>
        <label className="block text-sm font-headline-md mb-2">Borítókép</label>
        <input name="cover" type="file" accept="image/jpeg,image/png" className={fieldClass} />
      </div>
      {error && <p className="text-error text-sm">{error}</p>}
      <div className="flex flex-wrap gap-3 justify-end pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2 rounded-full border border-outline-variant font-medium hover:bg-surface-container-low min-h-11"
        >
          Mégse
        </button>
        <button type="submit" className="bg-primary text-on-primary px-5 py-2 rounded-full font-medium min-h-11">
          {album ? "Változtatások mentése" : "Album létrehozása"}
        </button>
      </div>
    </form>
  );
}
