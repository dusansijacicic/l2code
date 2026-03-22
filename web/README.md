# Kursevi — marketplace platforma

Next.js (App Router) + Supabase (Auth, Postgres, RLS) + Stripe (Checkout, webhook, Connect spremno) + deploy na Vercel.

## Brzina

- ISR na listi kurseva (`revalidate = 60`).
- Statički shell, podaci iz Supabase na serveru.
- Video ide preko CDN-a (Mux / Cloudflare Stream / Bunny) — ne serviraš velike fajlove sa Vercela.

## Bezbednost videa

- ID-evi i URL-ovi su u `lesson_video_secrets` sa RLS: samo instruktor i upisani polaznik.
- API ruta `/api/video/lesson` proverava enrollment pre nego što vrati playback URL.
- U produkciji uključi **potpisane URL-ove** (Mux signed JWT, Cloudflare signed token).

## Lokalno pokretanje

1. `cd web`
2. `cp .env.example .env.local` i popuni ključeve.
3. U Supabase SQL Editor pokreni `supabase/schema.sql`.
4. Auth → URL configuration: Site URL = `http://localhost:3000`, Redirect = `http://localhost:3000/auth/callback`.
5. `npm install` && `npm run dev`

## Stripe

- Test ključevi iz Stripe Dashboard-a.
- Webhook endpoint (lokalno: Stripe CLI `stripe listen --forward-to localhost:3000/api/webhooks/stripe`).
- `STRIPE_PLATFORM_ONLY=true` (podrazumevano): sav promet ide na platformski nalog; u bazi i dalje beležiš `platform_fee_cents` / `instructor_earning_cents` za isplate.
- Kada instruktor završi Connect onboarding, u `profiles.stripe_connect_account_id` stavi njegov `acct_...` i postavi `STRIPE_PLATFORM_ONLY=false`.

## Struktura

| Putanja | Opis |
|--------|------|
| `/` | Početna, istaknuti kursevi |
| `/courses` | Katalog |
| `/courses/[slug]` | Detalj, kupovina / besplatan upis |
| `/learn/[courseId]` | Sadržaj kursa |
| `/learn/.../lesson/[lessonId]` | Player + zadaci |
| `/dashboard/instructor` | Tvoji kursevi |
| `/dashboard/student` | Upisi |

## Video red u bazi (primer)

```sql
insert into lesson_video_secrets (lesson_id, video_provider, video_asset_id)
values ('UUID_LEKCIJE', 'mux', 'PLAYBACK_ID');
```

Zatim podesi `MUX_SIGNED_PLAYBACK_BASE_URL` ili Cloudflare subdomain u `.env` prema dokumentaciji provajdera.

## Deploy (Vercel)

- Poveži repo, dodaj iste env varijable.
- `NEXT_PUBLIC_APP_URL` = produkcijski URL.
- Stripe webhook URL = `https://tvoj-domen/api/webhooks/stripe`.
