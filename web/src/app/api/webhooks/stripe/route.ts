import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook nije konfigurisan" }, { status: 500 });
  }

  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Nema potpisa" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Neispravan potpis" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const courseId = session.metadata?.course_id;
    const userId = session.metadata?.user_id ?? session.client_reference_id ?? undefined;
    const platformFeeFromMeta = session.metadata?.platform_fee_cents;

    if (!courseId || !userId) {
      console.warn("Stripe webhook: nedostaju metadata", session.id);
      return NextResponse.json({ received: true });
    }

    const amountTotal = session.amount_total ?? 0;
    const currency = session.currency ?? "eur";
    let platformFeeCents = platformFeeFromMeta ? Number(platformFeeFromMeta) : 0;
    if (!platformFeeCents && session.payment_intent && typeof session.payment_intent === "object") {
      const pi = session.payment_intent as Stripe.PaymentIntent;
      platformFeeCents = pi.application_fee_amount ?? 0;
    }
    const instructorEarning = Math.max(amountTotal - platformFeeCents, 0);

    const admin = createAdminClient();
    const { error } = await admin.from("enrollments").upsert(
      {
        user_id: userId,
        course_id: courseId,
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id ?? null,
        amount_paid_cents: amountTotal,
        platform_fee_cents: platformFeeCents,
        instructor_earning_cents: instructorEarning,
        currency,
      },
      { onConflict: "user_id,course_id" }
    );

    if (error) {
      console.error("Enrollment upsert", error);
      return NextResponse.json({ error: "Baza" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
