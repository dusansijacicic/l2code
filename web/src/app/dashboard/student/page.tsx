import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/format";
import type { Course, Enrollment } from "@/types/database";

export default async function StudentDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("course_id, created_at, amount_paid_cents, currency")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const list = (enrollments ?? []) as Pick<
    Enrollment,
    "course_id" | "created_at" | "amount_paid_cents" | "currency"
  >[];

  const courses: (Course | null)[] = [];
  for (const e of list) {
    const { data: c } = await supabase.from("courses").select("*").eq("id", e.course_id).single();
    courses.push((c as Course) ?? null);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/dashboard" className="text-sm text-amber-400 hover:underline">
        ← Panel
      </Link>
      <h1 className="mt-4 text-3xl font-bold text-white">Moji kursevi</h1>
      {list.length === 0 ? (
        <p className="mt-8 text-zinc-500">
          Još nisi upisan ni na jedan kurs.{" "}
          <Link href="/courses" className="text-amber-400 hover:underline">
            Pregledaj katalog
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-8 space-y-4">
          {list.map((e, i) => {
            const c = courses[i];
            if (!c) return null;
            return (
              <li
                key={e.course_id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4"
              >
                <div>
                  <p className="font-medium text-white">{c.title}</p>
                  <p className="text-xs text-zinc-500">
                    Upisan{" "}
                    {e.created_at ? new Date(e.created_at).toLocaleDateString("sr-RS") : ""}
                    {e.amount_paid_cents != null && e.amount_paid_cents > 0 && e.currency
                      ? ` · ${formatMoney(e.amount_paid_cents, e.currency)}`
                      : null}
                  </p>
                </div>
                <Link
                  href={`/learn/${c.id}`}
                  className="rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-400"
                >
                  Uči
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
