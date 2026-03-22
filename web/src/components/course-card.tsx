import Link from "next/link";
import type { Course } from "@/types/database";
import { formatMoney } from "@/lib/format";

type Props = {
  course: Course;
  instructorName?: string | null;
};

export function CourseCard({ course, instructorName }: Props) {
  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 transition hover:border-amber-500/40 hover:bg-zinc-900"
    >
      <div className="aspect-video bg-zinc-800 bg-gradient-to-br from-zinc-800 to-zinc-900" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h2 className="font-semibold text-zinc-100 group-hover:text-amber-400">{course.title}</h2>
        {course.subtitle ? (
          <p className="line-clamp-2 text-sm text-zinc-400">{course.subtitle}</p>
        ) : null}
        <div className="mt-auto flex items-center justify-between pt-2 text-sm">
          <span className="text-zinc-500">{instructorName ?? "Instruktor"}</span>
          <span className="font-medium text-amber-400">
            {course.price_cents === 0 ? "Besplatno" : formatMoney(course.price_cents, course.currency)}
          </span>
        </div>
      </div>
    </Link>
  );
}
