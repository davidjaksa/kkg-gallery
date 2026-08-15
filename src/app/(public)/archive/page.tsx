import type { Metadata } from "next";
import { ArchiveGrid } from "@/components/archive-grid";
import { getAllPublicYears, yearStats } from "@/lib/queries";
import { yearDisplayName } from "@/lib/years";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Archívum",
};

export default async function ArchivePage() {
  const years = await getAllPublicYears();
  const items = years.map((year) => {
    const stats = yearStats(year);
    return { slug: year.slug, name: yearDisplayName(year), ...stats };
  });

  return (
    <main className="flex-grow px-margin-page py-12 max-w-7xl mx-auto w-full">
      <ArchiveGrid years={items} />
    </main>
  );
}
