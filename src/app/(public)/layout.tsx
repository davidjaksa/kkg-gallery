import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { getSessionUser } from "@/lib/session";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  return (
    <div className="min-h-screen flex flex-col">
      <Header user={user} />
      <div className="flex-grow">{children}</div>
      <Footer />
    </div>
  );
}
