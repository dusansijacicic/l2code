"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  courseId: string;
};

export function FreeEnrollButton({ courseId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enroll() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/enroll/free", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Upis nije uspeo");
        return;
      }
      router.push(`/learn/${courseId}`);
      router.refresh();
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
        onClick={enroll}
        disabled={loading}
        className="rounded-full border border-amber-500/50 bg-transparent px-8 py-3 font-semibold text-amber-400 hover:bg-amber-500/10 disabled:opacity-50"
      >
        {loading ? "Čekaj…" : "Upiši se besplatno"}
      </button>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
