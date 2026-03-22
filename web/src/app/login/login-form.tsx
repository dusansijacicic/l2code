"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const err = params.get("error");
  const nextPath = params.get("next");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(err ? "Greška pri prijavi." : null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage(error.message);
        return;
      }
      const safeNext =
        nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/dashboard";
      router.push(safeNext);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4">
      <h1 className="mb-6 text-2xl font-semibold text-white">Prijava</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none focus:border-amber-500"
        />
        <input
          type="password"
          required
          autoComplete="current-password"
          placeholder="Lozinka"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none focus:border-amber-500"
        />
        {message ? <p className="text-sm text-red-400">{message}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-amber-500 py-3 font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
        >
          {loading ? "Šaljem…" : "Uloguj me"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-zinc-500">
        Nemaš nalog?{" "}
        <Link href="/signup" className="text-amber-400 hover:underline">
          Registracija
        </Link>
      </p>
    </div>
  );
}
