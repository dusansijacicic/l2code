import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppUrl } from "@/lib/app-url";
import { centsToPayPalValue, paypalCreateOrder } from "@/lib/paypal";
import { createClient } from "@/lib/supabase/server";

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
      .select("id, slug, title, price_cents, currency, platform_fee_bps, status")
      .eq("slug", courseSlug)
      .eq("status", "published")
      .single();

    if (courseError || !course) {
      return NextResponse.json({ error: "Kurs nije pronađen." }, { status: 404 });
    }

    if (course.price_cents === 0) {
      return NextResponse.json({ error: "Besplatan kurs — koristi upis." }, { status: 400 });
    }

    const appUrl = getAppUrl();
    const platformFeeCents = Math.round((course.price_cents * course.platform_fee_bps) / 10_000);
    const customId = `${course.id}|${userData.user.id}|${platformFeeCents}`;
    const currency = course.currency.toUpperCase();

    const { approvalUrl } = await paypalCreateOrder({
      amountValue: centsToPayPalValue(course.price_cents),
      currencyCode: currency,
      customId,
      description: course.title,
      returnUrl: `${appUrl}/paypal/return`,
      cancelUrl: `${appUrl}/courses/${course.slug}?paypal=cancel`,
    });

    return NextResponse.json({ url: approvalUrl });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "PayPal narudžbina nije kreirana." },
      { status: 500 }
    );
  }
}
