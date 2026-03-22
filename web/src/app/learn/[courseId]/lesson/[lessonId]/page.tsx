import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SecureVideoPlayer } from "@/components/secure-video-player";
import { createClient } from "@/lib/supabase/server";
import type { LessonTask } from "@/types/database";

type Props = { params: Promise<{ courseId: string; lessonId: string }> };

export default async function LessonPage({ params }: Props) {
  const { courseId, lessonId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: lesson, error: lErr } = await supabase
    .from("course_lessons")
    .select("id, title, description, module_id, is_preview")
    .eq("id", lessonId)
    .single();

  if (lErr || !lesson) {
    notFound();
  }

  const { data: mod } = await supabase
    .from("course_modules")
    .select("course_id")
    .eq("id", lesson.module_id)
    .single();

  if (!mod || mod.course_id !== courseId) {
    notFound();
  }

  const { data: course } = await supabase
    .from("courses")
    .select("id, title, instructor_id, status")
    .eq("id", courseId)
    .single();

  if (!course) {
    notFound();
  }

  const isInstructor = course.instructor_id === user.id;
  if (!isInstructor) {
    const { data: enr } = await supabase
      .from("enrollments")
      .select("id")
      .eq("course_id", courseId)
      .eq("user_id", user.id)
      .maybeSingle();
    const previewOk = lesson.is_preview && course.status === "published";
    if (!enr && !previewOk) {
      redirect("/courses");
    }
  }

  const { data: tasks } = await supabase
    .from("lesson_tasks")
    .select("id, title, body, sort_order")
    .eq("lesson_id", lessonId)
    .order("sort_order", { ascending: true });

  const taskList = (tasks ?? []) as LessonTask[];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link href={`/learn/${courseId}`} className="text-sm text-amber-400 hover:underline">
        ← Nazad na kurs
      </Link>
      <h1 className="mt-4 text-3xl font-bold text-white">{lesson.title}</h1>
      {lesson.description ? (
        <p className="mt-4 whitespace-pre-wrap text-zinc-400">{lesson.description}</p>
      ) : null}

      <div className="mt-8">
        <SecureVideoPlayer lessonId={lesson.id} title={lesson.title} />
      </div>

      {taskList.length > 0 ? (
        <section className="mt-12">
          <h2 className="text-xl font-semibold text-white">Zadaci</h2>
          <ul className="mt-4 space-y-4">
            {taskList.map((t) => (
              <li
                key={t.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-zinc-300"
              >
                <p className="font-medium text-zinc-100">{t.title}</p>
                {t.body ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-400">{t.body}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
