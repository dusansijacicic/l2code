import Link from "next/link";
import { CourseCard } from "@/components/course-card";
import { createClient } from "@/lib/supabase/server";
import type { Course, InstructorPublic } from "@/types/database";

async function loadFeatured(): Promise<{ course: Course; instructor: InstructorPublic | null }[]> {
  try {
    const supabase = await createClient();
    const { data: courses, error } = await supabase
      .from("courses")
      .select("*")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(8);

    if (error || !courses?.length) {
      return [];
    }

    const rows: { course: Course; instructor: InstructorPublic | null }[] = [];
    for (const c of courses as Course[]) {
      const { data: inst } = await supabase.rpc("get_instructor_public", {
        target_id: c.instructor_id,
      });
      const first = Array.isArray(inst) ? inst[0] : null;
      rows.push({ course: c, instructor: first as InstructorPublic | null });
    }
    return rows;
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const featured = await loadFeatured();

  return (
    <div>
      <section className="border-b border-zinc-800 bg-gradient-to-b from-zinc-900/80 to-zinc-950 px-4 py-20">
        <div className="mx-auto max-w-6xl text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-amber-500">
            Marketplace za znanje
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Tvoji kursevi. Njihovo učenje.{" "}
            <span className="text-amber-400">Podeljen prihod.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400">
            Platforma je optimizovana za brzo učitavanje, CDN video i bezbedan pristup lekcijama. Instruktori
            dobijaju udeo od prodaje preko Stripe Connect-a.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/courses"
              className="rounded-full bg-amber-500 px-8 py-3 font-semibold text-zinc-950 hover:bg-amber-400"
            >
              Pregled kurseva
            </Link>
            <Link
              href="/dashboard/instructor/new"
              className="rounded-full border border-zinc-600 px-8 py-3 font-semibold text-zinc-200 hover:border-amber-500/50"
            >
              Objavi kurs
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-white">Istaknuti kursevi</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Podaci uživo iz Supabase-a (objavljeni kursevi).
            </p>
          </div>
          <Link href="/courses" className="text-sm text-amber-400 hover:underline">
            Svi kursevi →
          </Link>
        </div>
        {featured.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-700 p-12 text-center text-zinc-500">
            Još nema objavljenih kurseva. Poveži Supabase, pokreni SQL iz{" "}
            <code className="text-zinc-400">supabase/schema.sql</code> i dodaj sadržaj iz panela
            instruktora.
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {featured.map(({ course, instructor }) => (
              <CourseCard
                key={course.id}
                course={course}
                instructorName={instructor?.full_name}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
