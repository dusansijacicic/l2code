import Link from "next/link";
import { redirect } from "next/navigation";
import { completePayPalEnrollment } from "@/lib/paypal-enroll";
import { createClient } from "@/lib/supabase/server";

type Props = { searchParams: Promise<{ token?: string }> };

export default async function PayPalReturnPage({ searchParams }: Props) {
  const sp = await searchParams;
  const token = sp.token;
  if (!token) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="text-zinc-400">Nedostaje PayPal token.</p>
        <Link href="/courses" className="mt-4 inline-block text-amber-400 hover:underline">
          Na kurseve
        </Link>
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = `/paypal/return?token=${encodeURIComponent(token)}`;
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  const result = await completePayPalEnrollment(token, user.id);
  if (!result.ok) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="text-red-400">{result.message}</p>
        <Link href="/courses" className="mt-6 inline-block text-amber-400 hover:underline">
          Na kurseve
        </Link>
      </div>
    );
  }

  redirect(`/learn/${result.courseId}?paid=1`);
}
