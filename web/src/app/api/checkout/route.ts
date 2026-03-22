import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAppUrl, getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

const bodySchema = z.object({ courseSlug: z.string().min(1) });

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { courseSlug } = bodySchema.parse(json);

    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return NextResponse.json({ error: "Moraš biti ulogovan." }, { status: 401 });
    }

    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id, slug, title, price_cents, currency, platform_fee_bps, instructor_id, status")
      .eq("slug", courseSlug)
      .eq("status", "published")
      .single();

    if (courseError || !course) {
      return NextResponse.json({ error: "Kurs nije pronađen." }, { status: 404 });
    }

    if (course.price_cents === 0) {
      return NextResponse.json({ error: "Besplatan kurs — koristi upis." }, { status: 400 });
    }

    const { data: instructor } = await supabase
      .from("profiles")
      .select("stripe_connect_account_id, instructor_payout_ready")
      .eq("id", course.instructor_id)
      .single();

    const platformOnly = process.env.STRIPE_PLATFORM_ONLY !== "false";
    const destination = instructor?.stripe_connect_account_id;
    if (!platformOnly && !destination) {
      return NextResponse.json(
        { error: "Instruktor još nije povezao Stripe isplate. Probaj kasnije." },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const appUrl = getAppUrl();
    const platformFeeCents = Math.round((course.price_cents * course.platform_fee_bps) / 10_000);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: userData.user.id,
      customer_email: userData.user.email ?? undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: course.currency,
            unit_amount: course.price_cents,
            product_data: {
              name: course.title,
              metadata: { course_id: course.id },
            },
          },
        },
      ],
      success_url: `${appUrl}/learn/${course.id}?paid=1`,
      cancel_url: `${appUrl}/courses/${course.slug}`,
      metadata: {
        course_id: course.id,
        user_id: userData.user.id,
        platform_fee_cents: String(platformFeeCents),
      },
      payment_intent_data:
        platformOnly || !destination
          ? undefined
          : {
              application_fee_amount: platformFeeCents,
              transfer_data: { destination },
              metadata: {
                course_id: course.id,
                user_id: userData.user.id,
              },
            },
    });

    if (!session.url) {
      return NextResponse.json({ error: "Stripe nije vratio URL." }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Neuspešno kreiranje sesije." }, { status: 500 });
  }
}
