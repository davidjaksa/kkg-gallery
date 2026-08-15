import Link from "next/link";
import { HeaderActions } from "@/components/header-actions";
import type { SessionUser } from "@/lib/session";

export function Header({
  user,
  showSearch = true,
}: {
  user: SessionUser | null;
  showSearch?: boolean;
}) {
  return (
    <header className="bg-primary sticky top-0 z-50 overflow-visible">
      <div className="relative flex items-center w-full px-margin-page max-w-7xl mx-auto overflow-visible h-14 xl:h-[72px]">
        <Link
          href="/"
          aria-label="KKG Galéria"
          className="absolute left-margin-page inset-y-0 z-10 leading-none"
        >
          <img
            src="/epulet-full.png"
            alt="KKG Galéria"
            width={3970}
            height={1471}
            className="block h-full w-auto max-w-none m-0 select-none"
          />
        </Link>
        <div
          aria-hidden
          className="shrink-0 h-px w-[9.5rem] xl:w-[12.25rem]"
        />
        <HeaderActions user={user} showSearch={showSearch} />
      </div>
    </header>
  );
}
