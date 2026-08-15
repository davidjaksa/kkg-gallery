import { StorageMeter } from "@/components/recent-uploads";
import { formatBytes } from "@/lib/dates";
import { requireAdmin } from "@/lib/session";
import { getStorageUsage } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireAdmin();
  const usage = getStorageUsage();

  return (
    <div className="max-w-[720px]">
      <h1 className="font-headline-lg text-headline-lg mb-2">Beállítások</h1>
      <p className="font-body-md text-on-surface-variant mb-8">
        Az MVP-ben a beállítások a helyi tárhelyhasználatot mutatják.
      </p>
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
        <h2 className="font-headline-md text-headline-md mb-4">Tárhely</h2>
        <p className="font-body-md text-on-surface-variant mb-4">
          A fényképek a szerver `data/uploads` mappájában vannak. A kvóta a{" "}
          <span className="font-label-sm">STORAGE_QUOTA_BYTES</span> környezeti változóval állítható.
        </p>
        <StorageMeter
          percent={usage.percent}
          usedLabel={`${formatBytes(usage.used)} / ${formatBytes(usage.quota)}`}
        />
      </div>
    </div>
  );
}
