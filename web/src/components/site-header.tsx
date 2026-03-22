import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export async function SiteHeader() {
  let email: string | null = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    email = data.user?.email ?? null;
  } catch {
    /* env nije podešen */
  }

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-semibold tracking-tight text-amber-400">
          Kursevi
        </Link>
        <nav className="flex items-center gap-6 text-sm text-zinc-300">
          <Link href="/courses" className="hover:text-white">
            Kursevi
          </Link>
          {email ? (
            <>
              <Link href="/dashboard" className="hover:text-white">
                Panel
              </Link>
              <Link href="/logout" className="text-zinc-500 hover:text-white">
                Odjava
              </Link>
              <span className="max-w-[120px] truncate text-zinc-500" title={email}>
                {email}
              </span>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-white">
                Prijava
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-amber-500 px-4 py-1.5 font-medium text-zinc-950 hover:bg-amber-400"
              >
                Registracija
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
