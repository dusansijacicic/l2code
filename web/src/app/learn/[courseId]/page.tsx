import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CourseLesson, CourseModule } from "@/types/database";

type Props = { params: Promise<{ courseId: string }> };

export default async function LearnCoursePage({ params }: Props) {
  const { courseId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: course, error } = await supabase
    .from("courses")
    .select("id, title, instructor_id, status")
    .eq("id", courseId)
    .single();

  if (error || !course) {
    notFound();
  }

  const isInstructor = course.instructor_id === user.id;
  if (!isInstructor) {
    const { data: enr } = await supabase
      .from("enrollments")
      .select("id")
      .eq("course_id", course.id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!enr) {
      redirect("/courses");
    }
  }

  const { data: modules } = await supabase
    .from("course_modules")
    .select("id, title, sort_order")
    .eq("course_id", course.id)
    .order("sort_order", { ascending: true });

  const moduleList = (modules ?? []) as Pick<CourseModule, "id" | "title" | "sort_order">[];

  const blocks: { module: (typeof moduleList)[0]; lessons: CourseLesson[] }[] = [];
  for (const m of moduleList) {
    const { data: les } = await supabase
      .from("course_lessons")
      .select("id, title, sort_order, is_preview")
      .eq("module_id", m.id)
      .order("sort_order", { ascending: true });
    blocks.push({ module: m, lessons: (les ?? []) as CourseLesson[] });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/dashboard/student" className="text-sm text-amber-400 hover:underline">
        ← Moji kursevi
      </Link>
      <h1 className="mt-4 text-3xl font-bold text-white">{course.title}</h1>
      <p className="mt-2 text-sm text-zinc-500">
        {isInstructor ? "Pregled kao instruktor" : "Tvoj sadržaj"}
      </p>
      <ol className="mt-10 space-y-8">
        {blocks.map(({ module, lessons }) => (
          <li key={module.id}>
            <h2 className="text-lg font-semibold text-zinc-200">{module.title}</h2>
            <ul className="mt-3 space-y-2">
              {lessons.map((l) => (
                <li key={l.id}>
                  <Link
                    href={`/learn/${course.id}/lesson/${l.id}`}
                    className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-zinc-300 hover:border-amber-500/30 hover:text-white"
                  >
                    <span>{l.title}</span>
                    {l.is_preview ? (
                      <span className="text-xs text-amber-500">preview</span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}
