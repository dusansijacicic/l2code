"use client";

import { useState } from "react";

type Props = {
  courseSlug: string;
  disabled?: boolean;
  label?: string;
};

export function CheckoutButton({ courseSlug, disabled, label = "Plati sa PayPal" }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/paypal/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseSlug }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Greška pri plaćanju");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError("Mrežna greška");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || loading}
        className="rounded-full bg-amber-500 px-8 py-3 font-semibold text-zinc-950 disabled:opacity-50 hover:bg-amber-400"
      >
        {loading ? "Čekaj…" : label}
      </button>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
