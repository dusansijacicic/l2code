"use client";

import { useEffect, useState } from "react";

type Props = {
  lessonId: string;
  title: string;
};

export function SecureVideoPlayer({ lessonId, title }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/video/lesson?lessonId=${encodeURIComponent(lessonId)}`);
      const data = (await res.json()) as {
        playbackUrl?: string | null;
        message?: string;
        error?: string;
      };
      if (cancelled) return;
      if (!res.ok) {
        setHint(data.error ?? "Nema pristupa videu");
        return;
      }
      if (data.playbackUrl) {
        setSrc(data.playbackUrl);
      } else {
        setHint(
          data.message ??
            "Dodaj CDN (Mux / Cloudflare Stream) i env varijable — vidi README."
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  if (hint && !src) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-900 p-6 text-center text-sm text-zinc-400">
        {hint}
      </div>
    );
  }

  if (!src) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-xl bg-zinc-900 text-zinc-500">
        Učitavanje…
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-black shadow-xl">
      <video
        className="aspect-video w-full"
        controls
        controlsList="nodownload"
        playsInline
        preload="metadata"
        title={title}
        src={src}
      >
        <track kind="captions" />
      </video>
      <p className="px-3 py-2 text-xs text-zinc-500">
        Zaštita od direktnog linka: URL je kratkotrajan i izdat samo upisanim korisnicima. Snimanje
        ekrana i dalje nije tehnički blokirano.
      </p>
    </div>
  );
}
