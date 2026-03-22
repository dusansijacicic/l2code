import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const bodySchema = z.object({ courseId: z.string().uuid() });

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { courseId } = bodySchema.parse(json);

    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return NextResponse.json({ error: "Moraš biti ulogovan." }, { status: 401 });
    }

    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id, price_cents, status")
      .eq("id", courseId)
      .eq("status", "published")
      .single();

    if (courseError || !course) {
      return NextResponse.json({ error: "Kurs nije dostupan." }, { status: 404 });
    }

    if (course.price_cents !== 0) {
      return NextResponse.json({ error: "Kurs nije besplatan." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error: insertError } = await admin.from("enrollments").upsert(
      {
        user_id: userData.user.id,
        course_id: course.id,
        amount_paid_cents: 0,
        platform_fee_cents: 0,
        instructor_earning_cents: 0,
        currency: "eur",
      },
      { onConflict: "user_id,course_id" }
    );

    if (insertError) {
      console.error(insertError);
      return NextResponse.json({ error: "Upis nije sačuvan." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Greška servera." }, { status: 500 });
  }
}
