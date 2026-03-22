import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { publishCourse } from "@/app/actions/course";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/format";
import type { CourseLesson, CourseModule } from "@/types/database";

type Props = { params: Promise<{ courseId: string }> };

export default async function InstructorCoursePage({ params }: Props) {
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
    .select("*")
    .eq("id", courseId)
    .eq("instructor_id", user.id)
    .single();

  if (error || !course) {
    notFound();
  }

  const { data: modules } = await supabase
    .from("course_modules")
    .select("id, title, sort_order")
    .eq("course_id", course.id)
    .order("sort_order", { ascending: true });

  const moduleList = (modules ?? []) as Pick<CourseModule, "id" | "title" | "sort_order">[];
  const lessonRows: { lesson: CourseLesson; hasVideo: boolean }[] = [];

  for (const m of moduleList) {
    const { data: les } = await supabase
      .from("course_lessons")
      .select("id, title, sort_order, is_preview")
      .eq("module_id", m.id)
      .order("sort_order", { ascending: true });
    for (const l of (les ?? []) as CourseLesson[]) {
      const { data: sec } = await supabase
        .from("lesson_video_secrets")
        .select("lesson_id")
        .eq("lesson_id", l.id)
        .maybeSingle();
      lessonRows.push({ lesson: l, hasVideo: !!sec });
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/dashboard/instructor" className="text-sm text-amber-400 hover:underline">
        ← Moji kursevi
      </Link>
      <h1 className="mt-4 text-3xl font-bold text-white">{course.title}</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Status: <span className="text-zinc-300">{course.status}</span> · Cena:{" "}
        {formatMoney(course.price_cents, course.currency)}
      </p>

      {course.status === "draft" ? (
        <form
          action={async () => {
            "use server";
            await publishCourse(courseId);
          }}
          className="mt-6"
        >
          <button
            type="submit"
            className="rounded-full bg-emerald-600 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            Objavi kurs
          </button>
        </form>
      ) : (
        <p className="mt-6 text-sm text-emerald-500">Kurs je objavljen u katalogu.</p>
      )}

      <section className="mt-12">
        <h2 className="text-lg font-semibold text-white">Lekcije i video</h2>
        <p className="mt-2 text-sm text-zinc-500">
          U Supabase SQL Editor dodaj red u{" "}
          <code className="text-zinc-400">lesson_video_secrets</code> sa{" "}
          <code className="text-zinc-400">video_provider</code> (npr.{" "}
          <code className="text-zinc-400">mux</code>) i <code className="text-zinc-400">video_asset_id</code>{" "}
          (playback ID). Za potpisane URL-ove podesi env na Vercelu.
        </p>
        <ul className="mt-4 space-y-2 text-sm">
          {lessonRows.map(({ lesson, hasVideo }) => (
            <li
              key={lesson.id}
              className="flex items-center justify-between rounded-lg border border-zinc-800 px-3 py-2 text-zinc-300"
            >
              <span>{lesson.title}</span>
              <span className={hasVideo ? "text-emerald-500" : "text-amber-500"}>
                {hasVideo ? "video OK" : "nema video"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-10">
        <Link
          href={`/learn/${course.id}`}
          className="text-sm text-amber-400 hover:underline"
        >
          Pregled kao polaznik →
        </Link>
      </div>
    </div>
  );
}
