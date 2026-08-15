import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { safeCallbackUrl } from "@/lib/callback-url";
import { getSessionUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Bejelentkezés",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const user = await getSessionUser();
  if (user) redirect("/admin");

  const { callbackUrl } = await searchParams;
  const nextUrl = safeCallbackUrl(callbackUrl);

  return (
    <main className="flex-grow px-margin-page py-16 max-w-7xl mx-auto w-full">
      <div className="max-w-md mx-auto bg-surface-container-lowest border border-outline-variant rounded-xl p-5 md:p-8 shadow-sm">
        <h1 className="font-headline-lg text-headline-lg text-on-surface mb-8">Bejelentkezés</h1>
        <LoginForm callbackUrl={nextUrl} />
      </div>
    </main>
  );
}
