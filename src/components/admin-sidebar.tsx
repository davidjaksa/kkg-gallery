"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useAdminNav } from "@/components/admin-nav";
import { Icon } from "@/components/icon";
import type { SessionUser } from "@/lib/session";

const NAV = [
  { href: "/admin", label: "Vezérlőpult", icon: "dashboard", exact: true },
  { href: "/admin/years", label: "Évek kezelése", icon: "calendar_today" },
  { href: "/admin/albums", label: "Albumok", icon: "photo_album" },
  { href: "/admin/account", label: "Fiók", icon: "lock" },
  { href: "/admin/users", label: "Felhasználók", icon: "group", adminOnly: true },
  { href: "/admin/settings", label: "Beállítások", icon: "settings", adminOnly: true },
];

export function AdminSidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const adminNav = useAdminNav();
  const open = adminNav?.open ?? false;
  const setOpen = adminNav?.setOpen;
  const items = NAV.filter((item) => !item.adminOnly || user.role === "ADMIN");

  useEffect(() => {
    setOpen?.(false);
  }, [pathname, setOpen]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen?.(false);
    };
    const mq = window.matchMedia("(min-width: 1280px)");
    const onMq = () => {
      if (mq.matches) setOpen?.(false);
    };
    document.addEventListener("keydown", onKey);
    mq.addEventListener("change", onMq);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onMq);
      document.body.style.overflow = prev;
    };
  }, [open, setOpen]);

  return (
    <>
      {open ? (
        <button
          type="button"
          className="xl:hidden fixed inset-0 z-40 bg-on-surface/50"
          aria-label="Menü bezárása"
          onClick={() => setOpen?.(false)}
        />
      ) : null}
      <aside
        className={`flex flex-col h-[100dvh] py-stack-lg fixed left-0 top-0 w-[280px] max-w-[85vw] bg-[#272e34] shadow-md border-r border-outline-variant z-40 pt-20 xl:pt-24 pb-8 transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full xl:translate-x-0"
        }`}
      >
        <div className="px-6 mb-8 min-w-0">
          <h2 className="font-headline-md text-headline-md text-on-primary mb-1">Admin Portál</h2>
          <p className="font-body-md text-body-md text-secondary-fixed-dim">
            {user.role === "ADMIN" ? "Adminisztrátor" : "Szerkesztő"}
          </p>
          <p className="font-body-md text-body-md text-secondary-fixed-dim break-all">
            {user.email}
          </p>
        </div>
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {items.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  active
                    ? "flex items-center gap-3 bg-primary text-on-primary rounded-lg mx-2 px-4 py-3 font-body-md text-body-md min-h-11"
                    : "flex items-center gap-3 text-secondary-fixed-dim hover:text-on-primary mx-2 px-4 py-3 font-body-md text-body-md hover:bg-on-secondary-fixed-variant/20 transition-all rounded-lg min-h-11"
                }
              >
                <Icon name={item.icon} filled={active} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto px-4 space-y-2 pt-8">
          <Link
            href="/"
            className="flex items-center gap-3 text-secondary-fixed-dim hover:text-on-primary mx-2 px-4 py-2 font-body-md hover:bg-on-secondary-fixed-variant/20 rounded-lg min-h-11"
          >
            <Icon name="home" />
            Nyilvános galéria
          </Link>
        </div>
      </aside>
    </>
  );
}
