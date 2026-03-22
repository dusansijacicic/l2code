"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { slugify } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export async function createCourse(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const title = String(formData.get("title") ?? "").trim();
  if (!title) {
    redirect("/dashboard/instructor/new?error=" + encodeURIComponent("Naslov je obavezan."));
  }

  let slug = String(formData.get("slug") ?? "").trim();
  if (!slug) {
    slug = `${slugify(title)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  const priceRaw = Number(formData.get("price_cents") ?? 0);
  const price_cents = Number.isFinite(priceRaw) ? Math.max(0, Math.round(priceRaw)) : 0;
  const currency = String(formData.get("currency") ?? "eur").toLowerCase().slice(0, 3);

  const { data: course, error: cErr } = await supabase
    .from("courses")
    .insert({
      instructor_id: user.id,
      slug,
      title,
      subtitle: String(formData.get("subtitle") ?? "").trim() || null,
      description: String(formData.get("description") ?? "").trim() || null,
      price_cents,
      currency,
      status: "draft",
    })
    .select("id")
    .single();

  if (cErr || !course) {
    console.error(cErr);
    redirect(
      "/dashboard/instructor/new?error=" +
        encodeURIComponent("Kurs nije sačuvan (slug možda već postoji).")
    );
  }

  const { data: mod, error: mErr } = await supabase
    .from("course_modules")
    .insert({ course_id: course.id, title: "Modul 1", sort_order: 0 })
    .select("id")
    .single();

  if (mErr || !mod) {
    redirect("/dashboard/instructor/new?error=" + encodeURIComponent("Modul nije kreiran."));
  }

  const { error: lErr } = await supabase.from("course_lessons").insert({
    module_id: mod.id,
    title: "Uvodna lekcija",
    sort_order: 0,
    is_preview: true,
  });

  if (lErr) {
    redirect("/dashboard/instructor/new?error=" + encodeURIComponent("Lekcija nije kreirana."));
  }

  revalidatePath("/dashboard/instructor");
  redirect(`/dashboard/instructor/${course.id}`);
}

export async function publishCourse(courseId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Nisi ulogovan." };
  }

  const { error } = await supabase
    .from("courses")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("id", courseId)
    .eq("instructor_id", user.id);

  if (error) {
    return { error: "Objava nije uspela." };
  }

  revalidatePath("/courses");
  revalidatePath(`/dashboard/instructor/${courseId}`);
  return { ok: true };
}
