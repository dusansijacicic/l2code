import Link from "next/link";
import { CourseCard } from "@/components/course-card";
import { createClient } from "@/lib/supabase/server";
import type { Course, InstructorPublic } from "@/types/database";

export const revalidate = 60;

async function loadAll(): Promise<{ course: Course; instructor: InstructorPublic | null }[]> {
  try {
    const supabase = await createClient();
    const { data: courses, error } = await supabase
      .from("courses")
      .select("*")
      .eq("status", "published")
      .order("title", { ascending: true });

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

export default async function CoursesPage() {
  const list = await loadAll();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold text-white">Svi kursevi</h1>
      <p className="mt-2 text-zinc-400">Keširano 60s radi bržeg odziva.</p>
      {list.length === 0 ? (
        <p className="mt-12 text-zinc-500">
          Nema objavljenih kurseva.{" "}
          <Link href="/dashboard/instructor/new" className="text-amber-400 hover:underline">
            Kreiraj prvi
          </Link>
          .
        </p>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map(({ course, instructor }) => (
            <CourseCard
              key={course.id}
              course={course}
              instructorName={instructor?.full_name}
            />
          ))}
        </div>
      )}
    </div>
  );
}
