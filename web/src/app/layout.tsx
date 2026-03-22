import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kursevi — marketplace za online kurseve",
  description: "Uči, predaj, deli prihod. Brza platforma na Next.js, Supabase i PayPal.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sr" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-zinc-800 py-8 text-center text-xs text-zinc-600">
          Kursevi · Next.js + Supabase + PayPal
        </footer>
      </body>
    </html>
  );
}
