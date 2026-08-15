import { YearManager } from "@/components/year-manager";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { yearDisplayName } from "@/lib/years";

export const dynamic = "force-dynamic";

export default async function AdminYearsPage() {
  await requireStaff();
  const years = await prisma.year.findMany({
    orderBy: [{ sortOrder: "asc" }, { startYear: "desc" }],
    include: { _count: { select: { albums: true } } },
  });

  return (
    <YearManager
      years={years.map((year) => ({
        id: year.id,
        slug: year.slug,
        label: year.label,
        startYear: year.startYear,
        isCustom: year.isCustom,
        name: yearDisplayName(year),
        albumCount: year._count.albums,
      }))}
    />
  );
}
