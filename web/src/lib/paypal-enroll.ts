import { createAdminClient } from "@/lib/supabase/admin";
import {
  centsToPayPalValue,
  getPayPalAccessToken,
  parsePayPalCustomId,
  paypalCaptureOrder,
  paypalGetOrder,
} from "@/lib/paypal";

/**
 * Završava kupovinu posle PayPal redirecta: capture + upis enrollment-a.
 * Proverava da session korisnik odgovara custom_id (zaštita od zloupotrebe linka).
 */
export async function completePayPalEnrollment(
  orderId: string,
  loggedInUserId: string
): Promise<{ ok: true; courseId: string } | { ok: false; message: string }> {
  const accessToken = await getPayPalAccessToken();
  let order = await paypalGetOrder(orderId, accessToken);

  if (order.status === "APPROVED") {
    try {
      order = await paypalCaptureOrder(orderId, accessToken);
    } catch (e) {
      order = await paypalGetOrder(orderId, accessToken);
      if (order.status !== "COMPLETED") {
        console.error(e);
        return { ok: false, message: "Plaćanje nije završeno. Pokušaj ponovo." };
      }
    }
  }

  if (order.status !== "COMPLETED") {
    return { ok: false, message: `Status narudžbine: ${order.status}` };
  }

  const unit = order.purchase_units?.[0];
  const customId = unit?.custom_id;
  if (!customId) {
    return { ok: false, message: "Nedostaju podaci o kursu." };
  }

  const parsed = parsePayPalCustomId(customId);
  if (!parsed) {
    return { ok: false, message: "Neispravan format narudžbine." };
  }

  if (parsed.userId !== loggedInUserId) {
    return { ok: false, message: "Ovaj račun nije vezan za ovo plaćanje." };
  }

  const capture = unit?.payments?.captures?.[0];
  if (!capture?.id || !capture.amount?.value) {
    return { ok: false, message: "Nema potvrde uplate." };
  }

  const amountPaidCents = Math.round(parseFloat(capture.amount.value) * 100);
  const currency = (capture.amount.currency_code ?? "EUR").toLowerCase();
  const instructorEarning = Math.max(amountPaidCents - parsed.platformFeeCents, 0);

  const admin = createAdminClient();
  const { error } = await admin.from("enrollments").upsert(
    {
      user_id: parsed.userId,
      course_id: parsed.courseId,
      paypal_order_id: order.id,
      paypal_capture_id: capture.id,
      amount_paid_cents: amountPaidCents,
      platform_fee_cents: parsed.platformFeeCents,
      instructor_earning_cents: instructorEarning,
      currency,
    },
    { onConflict: "user_id,course_id" }
  );

  if (error) {
    console.error("PayPal enrollment upsert", error);
    return { ok: false, message: "Greška pri čuvanju upisa." };
  }

  return { ok: true, courseId: parsed.courseId };
}
