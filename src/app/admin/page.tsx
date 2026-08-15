import Link from "next/link";
import { Dropzone } from "@/components/dropzone";
import { Icon } from "@/components/icon";
import { StorageMeter } from "@/components/recent-uploads";
import { formatBytes } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { getStorageUsage } from "@/lib/storage";
import { yearDisplayName } from "@/lib/years";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const user = await requireStaff();
  const albums = await prisma.album.findMany({
    where: user.role === "ADMIN" ? undefined : { createdById: user.id },
    orderBy: { createdAt: "desc" },
    include: { year: true },
  });
  const usage = getStorageUsage();

  return (
    <div className="space-y-12">
      <section>
        <h2 className="font-headline-lg text-headline-lg text-on-surface mb-6">Fénykép Feltöltés és Kezelés</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Dropzone
              albums={albums.map((album) => ({
                id: album.id,
                title: album.title,
                yearSlug: yearDisplayName(album.year),
              }))}
            />
          </div>
          <div className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="font-headline-md text-headline-md text-on-surface mb-4">Gyorsműveletek</h3>
              <div className="space-y-3">
                <Link
                  href="/admin/albums"
                  className="w-full flex items-center gap-3 p-3 rounded hover:bg-surface-container-low transition-colors text-left border border-outline-variant"
                >
                  <Icon name="create_new_folder" className="text-primary" />
                  <span className="font-body-md text-on-surface font-medium">Új Album</span>
                </Link>
                <Link
                  href="/admin/years"
                  className="w-full flex items-center gap-3 p-3 rounded hover:bg-surface-container-low transition-colors text-left border border-outline-variant"
                >
                  <Icon name="calendar_today" className="text-secondary" />
                  <span className="font-body-md text-on-surface font-medium">Évek kezelése</span>
                </Link>
              </div>
            </div>
            <StorageMeter
              percent={usage.percent}
              usedLabel={`${formatBytes(usage.used)} / ${formatBytes(usage.quota)}`}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
