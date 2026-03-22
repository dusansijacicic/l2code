import Link from "next/link";
import { redirect } from "next/navigation";
import { createCourse } from "@/app/actions/course";
import { createClient } from "@/lib/supabase/server";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function NewCoursePage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const sp = await searchParams;
  const err = sp.error ? decodeURIComponent(sp.error) : null;

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <Link href="/dashboard/instructor" className="text-sm text-amber-400 hover:underline">
        ← Instruktor
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-white">Novi kurs</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Kreira se nacrt sa jednim modulom i uvodnom lekcijom. Video ID dodaješ u bazi (
        <code className="text-zinc-400">lesson_video_secrets</code>) ili kasnije kroz admin.
      </p>
      {err ? (
        <p className="mt-6 rounded-xl border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {err}
        </p>
      ) : null}
      <form action={createCourse} className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-2 text-sm">
          <span className="text-zinc-400">Naslov</span>
          <input
            name="title"
            required
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-amber-500"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="text-zinc-400">Slug (URL)</span>
          <input
            name="slug"
            placeholder="npr. uvod-u-react"
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-amber-500"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="text-zinc-400">Podnaslov</span>
          <input
            name="subtitle"
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-amber-500"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="text-zinc-400">Opis</span>
          <textarea
            name="description"
            rows={4}
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-amber-500"
          />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-zinc-400">Cena (centi)</span>
            <input
              name="price_cents"
              type="number"
              min={0}
              defaultValue={2900}
              className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-amber-500"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-zinc-400">Valuta</span>
            <input
              name="currency"
              defaultValue="eur"
              className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-amber-500"
            />
          </label>
        </div>
        <button
          type="submit"
          className="mt-4 rounded-full bg-amber-500 py-3 font-semibold text-zinc-950 hover:bg-amber-400"
        >
          Sačuvaj nacrt
        </button>
      </form>
    </div>
  );
}
