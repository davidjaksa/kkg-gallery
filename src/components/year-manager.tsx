"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createYear, deleteYear, updateYear } from "@/app/actions/years";
import { Icon } from "@/components/icon";
import { slugifyEnglish } from "@/lib/slug";
import { yearPath } from "@/lib/routes";
import { formatSchoolYear } from "@/lib/years";

type YearRow = {
  id: string;
  slug: string;
  label: string | null;
  startYear: number | null;
  isCustom: boolean;
  name: string;
  albumCount: number;
};

const fieldClass =
  "w-full p-3 rounded-lg border border-outline-variant bg-surface font-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none";

export function YearManager({ years }: { years: YearRow[] }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<YearRow | null>(null);
  const closeCreate = useCallback(() => setCreateOpen(false), []);
  const closeEdit = useCallback(() => setEditing(null), []);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-headline-lg text-headline-lg mb-2">Évek kezelése</h1>
          <p className="font-body-md text-on-surface-variant">
            A tanév neve és URL-je automatikusan a kezdőévből készül, például 2026 → 2026-27. Egyedi
            évnél saját nevet, angol URL-t és sorrendet adhat meg.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="bg-primary text-on-primary px-5 py-2 rounded-full font-medium flex items-center gap-2 shadow-sm hover:opacity-90 shrink-0 self-start"
        >
          <Icon name="calendar_today" className="text-[20px]" />
          Új év
        </button>
      </div>

      <div className="space-y-4">
        {years.length === 0 && <p className="font-body-md text-secondary">Még nincs tanév.</p>}
        {years.map((year) => (
          <YearEditCard key={year.id} year={year} onEdit={() => setEditing(year)} />
        ))}
      </div>

      {createOpen && (
        <YearDialog title="Új év" onClose={closeCreate}>
          <YearForm years={years} onCancel={closeCreate} onSuccess={closeCreate} />
        </YearDialog>
      )}
      {editing && (
        <YearDialog title="Év szerkesztése" onClose={closeEdit}>
          <YearForm years={years} year={editing} onCancel={closeEdit} onSuccess={closeEdit} />
        </YearDialog>
      )}
    </div>
  );
}

function YearDialog({
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
      aria-labelledby="year-dialog-title"
      onClick={onClose}
    >
      <div
        className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 md:p-6 w-full max-w-2xl shadow-xl relative max-h-[100dvh] overflow-y-auto"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-6">
          <h3 id="year-dialog-title" className="font-headline-md text-headline-md text-on-surface">
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

function YearForm({
  years,
  year,
  onCancel,
  onSuccess,
}: {
  years: YearRow[];
  year?: YearRow;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isCustom, setIsCustom] = useState(year?.isCustom ?? false);
  const [startYear, setStartYear] = useState(year?.startYear ? String(year.startYear) : "");
  const [label, setLabel] = useState(year?.label ?? "");
  const [slug, setSlug] = useState(year?.isCustom ? year.slug : "");
  const [slugTouched, setSlugTouched] = useState(Boolean(year?.isCustom));
  const [referenceYearId, setReferenceYearId] = useState("");
  const [position, setPosition] = useState<"before" | "after">("before");

  const otherYears = useMemo(
    () => years.filter((item) => item.id !== year?.id),
    [years, year?.id],
  );
  const preview = /^\d{4}$/.test(startYear) ? formatSchoolYear(Number(startYear)) : "";

  const suggestSlug = (nextLabel: string) => {
    if (slugTouched) return;
    setSlug(slugifyEnglish(nextLabel));
  };

  return (
    <form
      action={async (formData) => {
        const result = year ? await updateYear(formData) : await createYear(formData);
        setError(result.error ?? null);
        if (!result.error) onSuccess();
      }}
      className="space-y-4"
    >
      {year && <input type="hidden" name="id" value={year.id} />}
      <input type="hidden" name="isCustom" value={isCustom ? "on" : ""} />

      <label className="flex items-center gap-3 cursor-pointer select-none w-fit">
        <button
          type="button"
          role="switch"
          aria-checked={isCustom}
          onClick={() => setIsCustom((value) => !value)}
          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
            isCustom ? "bg-primary" : "bg-outline-variant"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 rounded-full bg-white shadow mt-0.5 transition-transform ${
              isCustom ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
        <span className="font-headline-md text-sm">Egyedi év</span>
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        {isCustom ? (
          <>
            <div>
              <label className="block text-sm font-headline-md mb-2">Egyedi név</label>
              <input
                name="label"
                required
                value={label}
                onChange={(event) => {
                  const value = event.target.value;
                  setLabel(value);
                  suggestSlug(value);
                }}
                placeholder="Archívum"
                className={fieldClass}
              />
            </div>
            <div>
              <label className="block text-sm font-headline-md mb-2">Egyedi URL-azonosító (angol)</label>
              <input
                name="slug"
                required
                value={slug}
                onChange={(event) => {
                  setSlugTouched(true);
                  setSlug(event.target.value);
                }}
                placeholder="school-history"
                className={`${fieldClass} font-label-sm`}
              />
            </div>
          </>
        ) : (
          <div>
            <label className="block text-sm font-headline-md mb-2">Kezdőév</label>
            <input
              name="startYear"
              value={startYear}
              onChange={(event) => setStartYear(event.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="2026"
              inputMode="numeric"
              required
              className={fieldClass}
            />
            <p className="mt-2 font-label-sm text-label-sm text-secondary uppercase">
              Megjelenő név / URL: {preview || "YYYY-YY"}
            </p>
          </div>
        )}
        <div className={isCustom ? "md:col-span-2" : ""}>
          <label className="block text-sm font-headline-md mb-2">Borítókép (opcionális)</label>
          <input name="cover" type="file" accept="image/jpeg,image/png" className="w-full font-body-md" />
        </div>
      </div>

      {isCustom && (
        <div className="grid gap-4 md:grid-cols-2 rounded-xl border border-outline-variant bg-surface-container-low p-4">
          {otherYears.length === 0 ? (
            <p className="md:col-span-2 font-body-md text-secondary text-sm">
              Még nincs másik év. Az új év a lista elejére kerül.
            </p>
          ) : (
            <>
              <div>
                <label className="block text-sm font-headline-md mb-2">Referenciaév</label>
                <select
                  name="referenceYearId"
                  required={!year}
                  value={referenceYearId}
                  onChange={(event) => setReferenceYearId(event.target.value)}
                  className={fieldClass}
                >
                  <option value="">{year ? "Jelenlegi sorrend megtartása" : "Válasszon évet…"}</option>
                  {otherYears.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <span className="block text-sm font-headline-md mb-2">Elhelyezés</span>
                <div className="flex gap-2 pt-1">
                  <label
                    className={`flex-1 text-center px-4 py-3 rounded-lg border cursor-pointer font-body-md ${
                      position === "before"
                        ? "border-primary bg-primary text-on-primary"
                        : "border-outline-variant bg-surface"
                    }`}
                  >
                    <input
                      type="radio"
                      name="position"
                      value="before"
                      checked={position === "before"}
                      onChange={() => setPosition("before")}
                      className="sr-only"
                    />
                    Elé
                  </label>
                  <label
                    className={`flex-1 text-center px-4 py-3 rounded-lg border cursor-pointer font-body-md ${
                      position === "after"
                        ? "border-primary bg-primary text-on-primary"
                        : "border-outline-variant bg-surface"
                    }`}
                  >
                    <input
                      type="radio"
                      name="position"
                      value="after"
                      checked={position === "after"}
                      onChange={() => setPosition("after")}
                      className="sr-only"
                    />
                    Mögé
                  </label>
                </div>
              </div>
            </>
          )}
        </div>
      )}

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
          {year ? "Változtatások mentése" : "Év létrehozása"}
        </button>
      </div>
    </form>
  );
}

function YearEditCard({ year, onEdit }: { year: YearRow; onEdit: () => void }) {
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 md:p-6 space-y-4">
      <div className="flex flex-wrap justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-headline-md text-on-surface truncate">{year.name}</h3>
            {year.isCustom && (
              <span className="shrink-0 font-label-sm text-label-sm uppercase tracking-wider text-primary bg-primary-fixed px-2 py-0.5 rounded">
                Egyedi
              </span>
            )}
          </div>
          <p className="font-label-sm text-label-sm text-secondary lowercase">
            {yearPath(year.slug)} · {year.albumCount} album
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="px-4 py-2 min-h-11 rounded-full border border-outline-variant text-sm font-medium hover:bg-surface-container-low"
          >
            Szerkesztés
          </button>
          <form
            action={async (formData) => {
              const result = await deleteYear(formData);
              setError(result.error ?? null);
            }}
          >
            <input type="hidden" name="id" value={year.id} />
            <button type="submit" className="px-4 py-2 min-h-11 rounded-full text-error text-sm">
              Törlés
            </button>
          </form>
        </div>
      </div>
      {error && <p className="text-error text-sm">{error}</p>}
    </div>
  );
}
