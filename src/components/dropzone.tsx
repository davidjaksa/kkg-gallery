"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/icon";

type AlbumOption = { id: string; title: string; yearSlug: string };

export function Dropzone({ albums }: { albums: AlbumOption[] }) {
  const [albumId, setAlbumId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const enabled = albumId.length > 0 && !busy;

  async function uploadFiles(files: FileList | File[]) {
    if (!albumId) return;
    const list = Array.from(files);
    if (list.length === 0) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    let ok = 0;
    let fail = 0;
    for (const file of list) {
      const body = new FormData();
      body.set("albumId", albumId);
      body.set("file", file);
      const res = await fetch("/api/upload", { method: "POST", body });
      if (res.ok) ok += 1;
      else {
        fail += 1;
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "A feltöltés sikertelen.");
      }
    }
    if (ok) setMessage(`${ok} fájl feltöltve.`);
    if (fail && !error) setError(`${fail} fájl sikertelen.`);
    setBusy(false);
  }

  return (
    <div>
      <div className="mb-6">
        <label htmlFor="album-select" className="block font-headline-md text-on-surface mb-2">
          Célalbum kiválasztása
        </label>
        <select
          id="album-select"
          value={albumId}
          onChange={(e) => setAlbumId(e.target.value)}
          className="w-full p-3 rounded-lg border border-outline-variant bg-surface-container-lowest font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
        >
          <option value="" disabled>
            Válasszon egy albumot...
          </option>
          {albums.map((album) => (
            <option key={album.id} value={album.id}>
              {album.yearSlug} — {album.title}
            </option>
          ))}
        </select>
        <p className="mt-2 font-body-md text-secondary text-sm">
          A feltöltés megkezdése előtt válasszon egy albumot. Minden fényképnek egy albumhoz kell tartoznia.
        </p>
      </div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (!enabled) return;
          void uploadFiles(e.dataTransfer.files);
        }}
        onClick={() => enabled && inputRef.current?.click()}
        className={`border-2 border-dashed border-secondary/30 bg-surface-container-lowest rounded-xl p-6 xl:p-12 flex flex-col items-center justify-center text-center min-h-[200px] xl:h-[300px] hover:border-primary transition-colors group ${
          enabled ? "cursor-pointer" : "opacity-50 pointer-events-none"
        }`}
      >
        <Icon name="cloud_upload" className="text-4xl text-secondary mb-4 group-hover:text-primary transition-colors" />
        <h3 className="font-headline-md text-headline-md text-on-surface mb-2 hidden xl:block">
          Húzza ide a fényképeket a kiválasztott albumhoz
        </h3>
        <h3 className="font-headline-md text-headline-md text-on-surface mb-2 xl:hidden">
          Koppintson a fájlok kiválasztásához
        </h3>
        <p className="font-body-md text-body-md text-secondary mb-6 hidden xl:block">
          vagy kattintson a fájlok tallózásához
        </p>
        <p className="font-label-sm text-label-sm text-secondary uppercase tracking-widest">
          JPG, PNG max 10MB
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void uploadFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      {busy && <p className="mt-4 font-body-md text-secondary">Feltöltés folyamatban…</p>}
      {message && <p className="mt-4 font-body-md text-on-surface">{message}</p>}
      {error && <p className="mt-4 font-body-md text-error">{error}</p>}
    </div>
  );
}
