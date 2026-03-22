export type PlaybackPayload = {
  provider: string;
  assetId: string;
  /** HLS ili DASH URL; u produkciji uvek potpisati (Mux JWT, CF Stream token, Bunny token) */
  playbackUrl: string | null;
  expiresInSeconds: number;
};

/**
 * Sastavi playback URL. Za Mux: potpisivanje JWT na serveru (vidi MUX dokumentaciju).
 * Ovde vraćamo null za URL dok ne dodaš signing — player stranica prikazuje uputstvo.
 */
export function resolvePlaybackPayload(
  provider: string,
  assetId: string
): PlaybackPayload {
  const base: PlaybackPayload = {
    provider,
    assetId,
    playbackUrl: null,
    expiresInSeconds: 900,
  };

  if (provider === "mux") {
    const signed = process.env.MUX_SIGNED_PLAYBACK_BASE_URL;
    if (signed) {
      return { ...base, playbackUrl: `${signed.replace(/\/$/, "")}/${assetId}` };
    }
  }

  if (provider === "cloudflare_stream") {
    const customer = process.env.CF_STREAM_CUSTOMER_SUBDOMAIN;
    if (customer) {
      return {
        ...base,
        playbackUrl: `https://${customer}.cloudflarestream.com/${assetId}/manifest/video.m3u8`,
      };
    }
  }

  return base;
}
