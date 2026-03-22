import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-white">Panel</h1>
      <p className="mt-2 text-zinc-400">Izaberi šta radiš danas.</p>
      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        <Link
          href="/dashboard/student"
          className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 transition hover:border-amber-500/40"
        >
          <h2 className="text-lg font-semibold text-white">Polaznik</h2>
          <p className="mt-2 text-sm text-zinc-500">Kursevi koje učiš i napredak.</p>
        </Link>
        <Link
          href="/dashboard/instructor"
          className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 transition hover:border-amber-500/40"
        >
          <h2 className="text-lg font-semibold text-white">Instruktor</h2>
          <p className="mt-2 text-sm text-zinc-500">Kreiraj i objavi kurseve, prati prodaju.</p>
        </Link>
      </div>
    </div>
  );
}
