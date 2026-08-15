import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-[50vh] flex flex-col items-center justify-center px-margin-page max-w-7xl mx-auto w-full text-center">
      <h1 className="font-headline-lg text-headline-lg mb-4">Az oldal nem található</h1>
      <p className="font-body-md text-on-surface-variant mb-6">A kért album, tanév vagy oldal nem elérhető.</p>
      <Link href="/" className="bg-primary text-on-primary px-6 py-2 rounded-full">
        Vissza a főoldalra
      </Link>
    </main>
  );
}
