import { AdminNavProvider } from "@/components/admin-nav";
import { AdminSidebar } from "@/components/admin-sidebar";
import { Header } from "@/components/header";
import { requireStaff } from "@/lib/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();

  return (
    <AdminNavProvider>
      <div className="min-h-screen flex flex-col">
        <Header user={user} showSearch={false} />
        <div className="flex flex-1">
          <AdminSidebar user={user} />
          <div className="flex-1 xl:ml-[280px] p-margin-page bg-surface min-h-[calc(100dvh-80px)] min-w-0">
            <div className="max-w-[1200px] mx-auto w-full">{children}</div>
          </div>
        </div>
      </div>
    </AdminNavProvider>
  );
}
