import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/format";
import type { Course } from "@/types/database";

export default async function InstructorDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: mine } = await supabase
    .from("courses")
    .select("*")
    .eq("instructor_id", user.id)
    .order("updated_at", { ascending: false });

  const courses = (mine ?? []) as Course[];

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Link href="/dashboard" className="text-sm text-amber-400 hover:underline">
        ← Panel
      </Link>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Instruktor</h1>
          <p className="mt-1 text-zinc-500">Tvoji kursevi i status objave.</p>
        </div>
        <Link
          href="/dashboard/instructor/new"
          className="rounded-full bg-amber-500 px-5 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-400"
        >
          Novi kurs
        </Link>
      </div>

      {courses.length === 0 ? (
        <p className="mt-12 text-zinc-500">
          Još nemaš kurseva.{" "}
          <Link href="/dashboard/instructor/new" className="text-amber-400 hover:underline">
            Kreiraj prvi
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-10 space-y-3">
          {courses.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3"
            >
              <div>
                <p className="font-medium text-white">{c.title}</p>
                <p className="text-xs text-zinc-500">
                  {c.status} · {formatMoney(c.price_cents, c.currency)}
                </p>
              </div>
              <Link
                href={`/dashboard/instructor/${c.id}`}
                className="text-sm text-amber-400 hover:underline"
              >
                Uredi / objavi
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
