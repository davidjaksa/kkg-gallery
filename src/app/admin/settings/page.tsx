import { StorageMeter } from "@/components/recent-uploads";
import { updateHomepageAlbumCount } from "@/app/actions/settings";
import { formatBytes } from "@/lib/dates";
import { requireAdmin } from "@/lib/session";
import { getHomepageAlbumCount, HOMEPAGE_ALBUM_COUNTS } from "@/lib/settings";
import { getStorageUsage } from "@/lib/storage";

export const dynamic = "force-dynamic";

const COUNT_LABELS: Record<(typeof HOMEPAGE_ALBUM_COUNTS)[number], string> = {
  "3": "3 album",
  "6": "6 album",
  "9": "9 album",
  "12": "12 album",
  all: "Összes",
};

export default async function AdminSettingsPage() {
  await requireAdmin();
  const usage = getStorageUsage();
  const homepageCount = await getHomepageAlbumCount();

  return (
    <div className="max-w-[720px] space-y-8">
      <div>
        <h1 className="font-headline-lg text-headline-lg mb-2">Beállítások</h1>
        <p className="font-body-md text-on-surface-variant">A kezdőlap és a tárhely beállításai.</p>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
        <h2 className="font-headline-md text-headline-md mb-4">Kezdőlap</h2>
        <p className="font-body-md text-on-surface-variant mb-4">
          Hány főalbum jelenjen meg a nyilvános kezdőlapon.
        </p>
        <form action={updateHomepageAlbumCount} className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <label className="flex-1">
            <span className="block text-sm font-headline-md mb-2">Darabszám</span>
            <select
              name="homepageAlbumCount"
              defaultValue={homepageCount}
              className="w-full p-3 rounded-lg border border-outline-variant bg-surface font-body-md"
            >
              {HOMEPAGE_ALBUM_COUNTS.map((value) => (
                <option key={value} value={value}>
                  {COUNT_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="bg-primary text-on-primary px-5 py-3 rounded-full font-medium min-h-11">
            Mentés
          </button>
        </form>
      </div>

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
