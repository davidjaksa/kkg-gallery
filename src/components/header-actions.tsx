"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { useAdminNav } from "@/components/admin-nav";
import { Icon } from "@/components/icon";
import { SearchBox } from "@/components/search-box";
import type { SessionUser } from "@/lib/session";

const iconBtn =
  "text-on-primary hover:bg-on-primary/10 rounded-full flex items-center justify-center min-h-11 min-w-11 shrink-0";

export function HeaderActions({
  user,
  showSearch = true,
}: {
  user: SessionUser | null;
  showSearch?: boolean;
}) {
  const pathname = usePathname();
  const adminNav = useAdminNav();
  const onAdmin = pathname.startsWith("/admin");

  return (
    <div className="flex items-center gap-1 xl:gap-4 relative z-10 ml-auto">
      {showSearch ? <SearchBox /> : null}
      {adminNav && onAdmin ? (
        <button
          type="button"
          className={`${iconBtn} xl:hidden`}
          aria-label={adminNav.open ? "Menü bezárása" : "Admin menü"}
          aria-expanded={adminNav.open}
          onClick={() => adminNav.setOpen(!adminNav.open)}
        >
          <Icon name={adminNav.open ? "close" : "menu"} />
        </button>
      ) : null}
      {user ? (
        <>
          {onAdmin ? (
            <Link
              href="/admin"
              className="hidden xl:flex border border-on-primary text-on-primary px-4 py-2 rounded-full font-medium scale-95 active:opacity-80 transition-transform items-center gap-2 hover:bg-on-primary/10 font-headline-md text-sm"
            >
              <Icon name="settings" className="text-sm" />
              Adminisztráció
            </Link>
          ) : (
            <Link
              href="/admin"
              aria-label="Adminisztráció"
              className={`${iconBtn} xl:min-w-0 xl:px-4 xl:py-2 border border-on-primary scale-95 active:opacity-80 transition-transform xl:gap-2 font-headline-md text-sm`}
            >
              <Icon name="settings" className="text-sm" />
              <span className="sr-only xl:not-sr-only">Adminisztráció</span>
            </Link>
          )}
          <form action={logoutAction}>
            <button type="submit" aria-label="Kijelentkezés" className={`${iconBtn} xl:px-3 xl:py-2 xl:min-w-0`}>
              <Icon name="logout" className="xl:hidden" />
              <span className="sr-only xl:not-sr-only font-headline-md text-sm">Kijelentkezés</span>
            </button>
          </form>
        </>
      ) : null}
    </div>
  );
}
