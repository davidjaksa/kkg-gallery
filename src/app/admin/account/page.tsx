import { PasswordForm } from "@/components/password-form";
import { requireStaff } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  await requireStaff();

  return (
    <div>
      <h1 className="font-headline-lg text-headline-lg mb-2">Fiók</h1>
      <p className="font-body-md text-on-surface-variant mb-8">
        A jelszó megváltoztatásához adja meg a jelenlegi jelszót. Legalább 12 karakter.
      </p>
      <PasswordForm />
    </div>
  );
}
