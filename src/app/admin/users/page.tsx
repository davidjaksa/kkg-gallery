import { UserManager } from "@/components/user-manager";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const admin = await requireAdmin();
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div>
      <h1 className="font-headline-lg text-headline-lg mb-2">Felhasználók</h1>
      <p className="font-body-md text-on-surface-variant mb-8">
        Csak admin hozhat létre munkatársakat. Nincs nyilvános regisztráció.
      </p>
      <UserManager
        currentUserId={admin.id}
        users={users.map((user) => ({
          id: user.id,
          email: user.email,
          role: user.role,
        }))}
      />
    </div>
  );
}
