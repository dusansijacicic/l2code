import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckoutButton } from "@/components/checkout-button";
import { FreeEnrollButton } from "@/components/free-enroll-button";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/format";
import type { CourseLesson, CourseModule, InstructorPublic } from "@/types/database";

type Props = { params: Promise<{ slug: string }> };

export default async function CourseDetailPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: course, error } = await supabase
    .from("courses")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (error || !course) {
    notFound();
  }

  const { data: inst } = await supabase.rpc("get_instructor_public", {
    target_id: course.instructor_id,
  });
  const instructor = (Array.isArray(inst) ? inst[0] : null) as InstructorPublic | null;

  const { data: modules } = await supabase
    .from("course_modules")
    .select("id, title, sort_order")
    .eq("course_id", course.id)
    .order("sort_order", { ascending: true });

  const moduleList = (modules ?? []) as Pick<CourseModule, "id" | "title" | "sort_order">[];
  const lessonsByModule: Record<string, CourseLesson[]> = {};

  for (const m of moduleList) {
    const { data: les } = await supabase
      .from("course_lessons")
      .select("id, title, sort_order, duration_seconds, is_preview")
      .eq("module_id", m.id)
      .order("sort_order", { ascending: true });
    lessonsByModule[m.id] = (les ?? []) as CourseLesson[];
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  let enrolled = false;
  if (user) {
    const { data: enr } = await supabase
      .from("enrollments")
      .select("id")
      .eq("course_id", course.id)
      .eq("user_id", user.id)
      .maybeSingle();
    enrolled = !!enr;
  }

  const firstLessonId = moduleList.flatMap((m) => lessonsByModule[m.id] ?? [])[0]?.id;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="grid gap-12 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <p className="text-sm text-amber-500">{instructor?.full_name ?? "Instruktor"}</p>
          <h1 className="mt-2 text-4xl font-bold text-white">{course.title}</h1>
          {course.subtitle ? <p className="mt-3 text-xl text-zinc-400">{course.subtitle}</p> : null}
          <div className="prose prose-invert mt-8 max-w-none whitespace-pre-wrap text-zinc-300">
            {course.description ?? "Bez opisa."}
          </div>

          <h2 className="mt-12 text-xl font-semibold text-white">Sadržaj kursa</h2>
          <ul className="mt-4 space-y-6">
            {moduleList.map((m) => (
              <li key={m.id} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                <p className="font-medium text-zinc-200">{m.title}</p>
                <ul className="mt-2 space-y-1 text-sm text-zinc-400">
                  {(lessonsByModule[m.id] ?? []).map((l) => (
                    <li key={l.id} className="flex justify-between gap-2">
                      <span>
                        {l.title}
                        {l.is_preview ? (
                          <span className="ml-2 text-xs text-amber-500">preview</span>
                        ) : null}
                      </span>
                      {l.duration_seconds ? (
                        <span className="shrink-0 text-zinc-600">{Math.ceil(l.duration_seconds / 60)} min</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>

        <aside className="lg:col-span-1">
          <div className="sticky top-20 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
            <p className="text-3xl font-bold text-white">
              {course.price_cents === 0
                ? "Besplatno"
                : formatMoney(course.price_cents, course.currency)}
            </p>
            <p className="mt-2 text-sm text-zinc-500">
              Platformska provizija: {(course.platform_fee_bps / 100).toFixed(0)}% (podešava se po kursu).
            </p>
            <div className="mt-6">
              {!user ? (
                <Link
                  href="/login"
                  className="block w-full rounded-full bg-amber-500 py-3 text-center font-semibold text-zinc-950 hover:bg-amber-400"
                >
                  Uloguj se da kupiš
                </Link>
              ) : enrolled ? (
                <Link
                  href={`/learn/${course.id}`}
                  className="block w-full rounded-full bg-emerald-600 py-3 text-center font-semibold text-white hover:bg-emerald-500"
                >
                  Nastavi učenje
                </Link>
              ) : course.price_cents === 0 ? (
                <FreeEnrollButton courseId={course.id} />
              ) : (
                <CheckoutButton courseSlug={course.slug} />
              )}
            </div>
            {firstLessonId && user && enrolled ? (
              <Link
                href={`/learn/${course.id}/lesson/${firstLessonId}`}
                className="mt-4 block text-center text-sm text-amber-400 hover:underline"
              >
                Prva lekcija →
              </Link>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
