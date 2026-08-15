"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";

export function SearchBox() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  function submit(event?: React.FormEvent) {
    event?.preventDefault();
    const query = q.trim();
    if (!query) {
      router.push("/search");
      setOpen(false);
      return;
    }
    router.push(`/search?q=${encodeURIComponent(query)}`);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <form onSubmit={submit} className="relative hidden xl:block">
        <input
          type="search"
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Keresés..."
          className="bg-on-primary/90 text-on-surface placeholder:text-on-surface-variant border-none rounded-full pl-4 pr-10 py-2 text-base focus:ring-2 focus:ring-white w-64 transition-all font-body-md"
        />
        <button
          type="submit"
          className="absolute inset-y-0 right-0 flex items-center justify-center min-w-11 text-on-surface-variant"
          aria-label="Keresés"
        >
          <Icon name="search" className="!text-[18px] leading-none" />
        </button>
      </form>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="xl:hidden text-on-primary hover:bg-on-primary/10 transition-colors flex items-center justify-center min-h-11 min-w-11 rounded-full"
        aria-label="Keresés"
        aria-expanded={open}
      >
        <Icon name="search" />
      </button>
      {open ? (
        <div className="fixed inset-0 z-[60] xl:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-on-surface/40"
            aria-label="Keresés bezárása"
            onClick={() => setOpen(false)}
          />
          <div className="relative bg-primary h-14 w-full flex items-center gap-1 px-2">
            <form onSubmit={submit} className="relative flex-1 min-w-0">
              <input
                autoFocus
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Keresés..."
                className="w-full bg-on-primary text-on-surface placeholder:text-on-surface-variant border-none rounded-full pl-4 pr-11 py-2 text-base focus:ring-2 focus:ring-white font-body-md"
              />
              <button
                type="submit"
                className="absolute inset-y-0 right-0 flex items-center justify-center min-w-11 text-on-surface-variant"
                aria-label="Keresés"
              >
                <Icon name="search" className="!text-[18px] leading-none" />
              </button>
            </form>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-on-primary hover:bg-on-primary/10 rounded-full flex items-center justify-center min-h-11 min-w-11 shrink-0"
              aria-label="Bezárás"
            >
              <Icon name="close" />
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
