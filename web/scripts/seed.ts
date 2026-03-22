/**
 * Detaljan dev seed za Supabase (kursevi, moduli, lekcije, video zapisi, zadaci, upisi, progres).
 *
 * Pokretanje iz foldera web/:
 *   npm run seed
 *
 * Potrebno u .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * (isti kao za admin klijent). Kreira test naloge ako ne postoje.
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Nedostaje NEXT_PUBLIC_SUPABASE_URL ili SUPABASE_SERVICE_ROLE_KEY (.env.local).");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const INSTRUCTOR = {
  email: "seed.instructor@example.com",
  password: "SeedInstructor123!",
  full_name: "Seed Instruktor",
  bio: "Demo instruktor za lokalni seed. Biografija je namenjena karticama i javnom profilu.",
};

const STUDENT = {
  email: "seed.student@example.com",
  password: "SeedStudent123!",
  full_name: "Seed Polaznik",
};

const ADMIN = {
  email: "seed.admin@example.com",
  password: "SeedAdmin123!",
  full_name: "Seed Admin",
};

async function findUserIdByEmail(email: string): Promise<string | null> {
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) return hit.id;
    if (data.users.length < perPage) break;
    page += 1;
  }
  return null;
}

async function ensureUser(
  email: string,
  password: string,
  full_name: string
): Promise<string> {
  const existing = await findUserIdByEmail(email);
  if (existing) {
    console.log(`  Korisnik već postoji: ${email}`);
    return existing;
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });
  if (error) throw error;
  if (!data.user) throw new Error(`createUser bez user za ${email}`);
  console.log(`  Kreiran nalog: ${email}`);
  return data.user.id;
}

async function main() {
  console.log("Seed: osiguravam korisnike…");
  const instructorId = await ensureUser(
    INSTRUCTOR.email,
    INSTRUCTOR.password,
    INSTRUCTOR.full_name
  );
  const studentId = await ensureUser(STUDENT.email, STUDENT.password, STUDENT.full_name);
  const adminId = await ensureUser(ADMIN.email, ADMIN.password, ADMIN.full_name);

  const { error: instrUpdErr } = await supabase
    .from("profiles")
    .update({
      role: "instructor",
      bio: INSTRUCTOR.bio,
      instructor_payout_ready: true,
    })
    .eq("id", instructorId);
  if (instrUpdErr) throw instrUpdErr;

  const { error: adminUpdErr } = await supabase
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", adminId);
  if (adminUpdErr) throw adminUpdErr;

  console.log("Seed: proveravam kurs seed-web-uvod…");
  const { data: existingCourse } = await supabase
    .from("courses")
    .select("id")
    .eq("slug", "seed-web-uvod")
    .maybeSingle();

  if (existingCourse?.id) {
    console.log("  Kurs seed-web-uvod već postoji — preskačem kreiranje kursa/drveća.");
    console.log("Gotovo (korisnici ažurirani, kurs već u bazi).");
    return;
  }

  const now = new Date().toISOString();

  const { data: course1, error: c1Err } = await supabase
    .from("courses")
    .insert({
      instructor_id: instructorId,
      slug: "seed-web-uvod",
      title: "Web uvod (seed)",
      subtitle: "Objavljeno — dva modula, preview lekcije, zadaci, video placeholderi",
      description:
        "Demo kurs za razvoj UI-ja. Sadrži modul osnove i modul napredno, " +
        "nekoliko lekcija sa `is_preview`, zadatke i `lesson_video_secrets` sa lažnim asset ID-jevima.",
      thumbnail_url: null,
      price_cents: 4900,
      currency: "eur",
      platform_fee_bps: 2000,
      status: "published",
      published_at: now,
    })
    .select("id")
    .single();
  if (c1Err) throw c1Err;

  const { data: course2, error: c2Err } = await supabase
    .from("courses")
    .insert({
      instructor_id: instructorId,
      slug: "seed-nacrt-kurs",
      title: "Nacrt kurs (seed)",
      subtitle: "Draft — ne vidi se na javnoj listi",
      description: "Kurs u statusu draft za testiranje instruktorskog panela.",
      price_cents: 1500,
      currency: "eur",
      platform_fee_bps: 2000,
      status: "draft",
      published_at: null,
    })
    .select("id")
    .single();
  if (c2Err) throw c2Err;

  const { data: modA, error: mAerr } = await supabase
    .from("course_modules")
    .insert({ course_id: course1.id, title: "Modul 1 — Osnove", sort_order: 0 })
    .select("id")
    .single();
  if (mAerr) throw mAerr;

  const { data: modB, error: mBerr } = await supabase
    .from("course_modules")
    .insert({ course_id: course1.id, title: "Modul 2 — Praksa", sort_order: 1 })
    .select("id")
    .single();
  if (mBerr) throw mBerr;

  const { data: modDraft, error: mDerr } = await supabase
    .from("course_modules")
    .insert({ course_id: course2.id, title: "Jedini modul nacrta", sort_order: 0 })
    .select("id")
    .single();
  if (mDerr) throw mDerr;

  type LessonRow = {
    id: string;
    title: string;
    is_preview: boolean;
  };

  const lessonsA: LessonRow[] = [];
  const insertsA = [
    {
      title: "Dobrodošlica i pregled kursa",
      description: "Šta ćemo raditi; alati; kako koristiti platformu.",
      sort_order: 0,
      duration_seconds: 420,
      is_preview: true,
    },
    {
      title: "HTML struktura dokumenta",
      description: "DOCTYPE, head, body, semantički tagovi.",
      sort_order: 1,
      duration_seconds: 900,
      is_preview: true,
    },
    {
      title: "CSS selektori i kaskada",
      description: "Klase, ID, specifičnost, nasleđe.",
      sort_order: 2,
      duration_seconds: 1200,
      is_preview: false,
    },
  ];

  for (const row of insertsA) {
    const { data, error } = await supabase
      .from("course_lessons")
      .insert({ module_id: modA.id, ...row })
      .select("id, title, is_preview")
      .single();
    if (error) throw error;
    lessonsA.push({
      id: data.id,
      title: data.title,
      is_preview: data.is_preview,
    });
  }

  const lessonsB: LessonRow[] = [];
  const insertsB = [
    {
      title: "Forme i validacija",
      description: "input, label, accessibility, osnovna validacija.",
      sort_order: 0,
      duration_seconds: 1500,
      is_preview: false,
    },
    {
      title: "Fetch API i JSON",
      description: "async/await, greške, loading stanja.",
      sort_order: 1,
      duration_seconds: 1800,
      is_preview: false,
    },
  ];

  for (const row of insertsB) {
    const { data, error } = await supabase
      .from("course_lessons")
      .insert({ module_id: modB.id, ...row })
      .select("id, title, is_preview")
      .single();
    if (error) throw error;
    lessonsB.push({
      id: data.id,
      title: data.title,
      is_preview: data.is_preview,
    });
  }

  const { data: draftLesson, error: dlErr } = await supabase
    .from("course_lessons")
    .insert({
      module_id: modDraft.id,
      title: "Lekcija u nacrtu",
      description: "Vidljiva samo instruktoru dok je kurs draft.",
      sort_order: 0,
      duration_seconds: 600,
      is_preview: false,
    })
    .select("id")
    .single();
  if (dlErr) throw dlErr;

  const allLessons = [...lessonsA, ...lessonsB];

  const videoRows = allLessons.map((l, i) => ({
    lesson_id: l.id,
    video_provider: "mux" as const,
    video_asset_id: `seed-mux-asset-${l.id.slice(0, 8)}-${i}`,
  }));
  const { error: vErr } = await supabase.from("lesson_video_secrets").insert(videoRows);
  if (vErr) throw vErr;

  const taskPayload: { lesson_id: string; title: string; body: string | null; sort_order: number }[] =
    [];
  for (const l of lessonsA) {
    taskPayload.push({
      lesson_id: l.id,
      title: "Kratko pitanje",
      body: "U jednoj rečenici napiši zašto je semantički HTML važan.",
      sort_order: 0,
    });
  }
  taskPayload.push({
    lesson_id: lessonsB[0].id,
    title: "Mini zadatak",
    body: "Nacrtaj (tekstualno) polja za login formu i koja su pravila za `type` atribute.",
    sort_order: 0,
  });
  taskPayload.push({
    lesson_id: lessonsB[1].id,
    title: "Čitanje",
    body: null,
    sort_order: 0,
  });

  const { error: tErr } = await supabase.from("lesson_tasks").insert(taskPayload);
  if (tErr) throw tErr;

  const { error: enrErr } = await supabase.from("enrollments").insert({
    user_id: studentId,
    course_id: course1.id,
    stripe_checkout_session_id: null,
    stripe_payment_intent_id: null,
    paypal_order_id: "SEED-PAYPAL-ORDER-1",
    paypal_capture_id: "SEED-PAYPAL-CAPTURE-1",
    amount_paid_cents: 4900,
    platform_fee_cents: 980,
    instructor_earning_cents: 3920,
    currency: "eur",
  });
  if (enrErr) throw enrErr;

  const firstLessonWithVideo = lessonsA[1];
  const { error: pErr } = await supabase.from("lesson_progress").insert({
    user_id: studentId,
    lesson_id: firstLessonWithVideo.id,
    progress_percent: 55,
    completed_at: null,
  });
  if (pErr) throw pErr;

  const { error: p2Err } = await supabase.from("lesson_progress").insert({
    user_id: studentId,
    lesson_id: lessonsA[0].id,
    progress_percent: 100,
    completed_at: now,
  });
  if (p2Err) throw p2Err;

  console.log("  Objavljen kurs:", course1.id, "slug seed-web-uvod");
  console.log("  Draft kurs:", course2.id, "slug seed-nacrt-kurs + lekcija", draftLesson.id);
  console.log("  Upis polaznika + progres na dve lekcije.");
  console.log("Gotovo.");
  console.log("\nNalozi (email / lozinka):");
  console.log(`  Instruktor: ${INSTRUCTOR.email} / ${INSTRUCTOR.password}`);
  console.log(`  Polaznik:   ${STUDENT.email} / ${STUDENT.password}`);
  console.log(`  Admin:      ${ADMIN.email} / ${ADMIN.password}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
