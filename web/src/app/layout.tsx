import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
});

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
    <html
      lang="sr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
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
