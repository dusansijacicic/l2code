"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const origin = window.location.origin;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${origin}/auth/callback`,
          data: { full_name: fullName },
        },
      });
      if (error) {
        setMessage(error.message);
        return;
      }
      setDone(true);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-xl font-semibold text-white">Proveri email</h1>
        <p className="mt-4 text-zinc-400">
          Poslali smo potvrdu (ako je uključena u Supabase Auth podešavanjima). Posle toga se uloguj.
        </p>
        <Link href="/login" className="mt-8 inline-block text-amber-400 hover:underline">
          Na prijavu
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4">
      <h1 className="mb-6 text-2xl font-semibold text-white">Registracija</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <input
          type="text"
          placeholder="Ime i prezime"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none focus:border-amber-500"
        />
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
          autoComplete="new-password"
          placeholder="Lozinka (min. 6)"
          minLength={6}
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
          {loading ? "Šaljem…" : "Napravi nalog"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-zinc-500">
        Već imaš nalog?{" "}
        <Link href="/login" className="text-amber-400 hover:underline">
          Prijava
        </Link>
      </p>
    </div>
  );
}
