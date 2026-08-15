import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Libre_Franklin, Work_Sans } from "next/font/google";
import "./globals.css";

const workSans = Work_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-work-sans",
  weight: ["400", "500", "600", "700"],
});

const libreFranklin = Libre_Franklin({
  subsets: ["latin", "latin-ext"],
  variable: "--font-libre-franklin",
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "latin-ext"],
  variable: "--font-jetbrains-mono",
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "KKG Galéria",
    template: "%s · KKG Galéria",
  },
  description: "Könyves Kálmán Gimnázium hivatalos fényképarchívuma.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hu">
      <body
        className={`${workSans.variable} ${libreFranklin.variable} ${jetbrainsMono.variable} bg-background text-on-background min-h-screen antialiased font-body-md`}
      >
        {children}
      </body>
    </html>
  );
}
