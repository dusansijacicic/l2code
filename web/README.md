# Kursevi — marketplace platforma

Next.js (App Router) + Supabase (Auth, Postgres, RLS) + PayPal (Checkout Orders) + deploy na Vercel.

**Detaljno uputstvo (Supabase + Vercel, korak po korak):** [UPUTSTVO_SUPABASE_I_VERCEL.md](./UPUTSTVO_SUPABASE_I_VERCEL.md)

## Brzina

- ISR na listi kurseva (`revalidate = 60`).
- Statički shell, podaci iz Supabase na serveru.
- Video ide preko CDN-a (Mux / Cloudflare Stream / Bunny) — ne serviraš velike fajlove sa Vercela.

## Bezbednost videa

- ID-evi i URL-ovi su u `lesson_video_secrets` sa RLS: samo instruktor i upisani polaznik.
- API ruta `/api/video/lesson` proverava enrollment pre nego što vrati playback URL.
- U produkciji uključi **potpisane URL-ove** (Mux signed JWT, Cloudflare signed token).

## Supabase — setup korak po korak

### 1. Novi projekat

1. Otvori [supabase.com](https://supabase.com) → **Start your project** / **New project**.
2. Izaberi organizaciju, **ime projekta** (npr. `kursevi`), **lozinku za bazu** (sačuvaj je negde sigurno).
3. **Region**: što bliže korisnicima (npr. `Frankfurt` za EU).
4. Sačekaj da se projekat kreira (~1–2 min).

### 2. API ključevi → `.env.local`

1. U levom meniju: **Project Settings** (zupčanik) → **API**.
2. Kopiraj:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** ključ → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** ključ → `SUPABASE_SERVICE_ROLE_KEY` (samo server, **nikad** u frontend kod ili Git)

U folderu `web`:

```bash
copy .env.example .env.local
```

(ili ručno napravi `.env.local` i nalepi vrednosti.)

### 3. Šema baze (tabele, RLS, trigger za nalog)

1. U Supabase: **SQL Editor** → **New query**.
2. Otvori lokalno `web/supabase/schema.sql`, iskopiraj **ceo** sadržaj, nalepi u editor i klikni **Run**.

Ako dobiješ grešku na triggeru za `auth.users`, u delu:

`execute function public.handle_new_user ()`

probaj zameniti sa:

`execute procedure public.handle_new_user ()`

(zavisi od verzije Postgresa), pa ponovo Run.

### 4. Autentifikacija (email)

1. **Authentication** → **Providers** → **Email**: uključi **Enable Email provider**.
2. Za brzo lokalno testiranje: **Authentication** → **Providers** → **Email** → isključi **Confirm email** (opciono), ili ostavi uključeno i klikni link iz mejla pri registraciji.

### 5. URL-ovi za redirect (bitno za login)

**Authentication** → **URL Configuration**:

| Polje | Vrednost (lokalno) |
|--------|---------------------|
| **Site URL** | `http://localhost:3000` |
| **Redirect URLs** | `http://localhost:3000/auth/callback` |

Dodaj i produkciju kad deployuješ, npr.:

`https://tvoj-domen.vercel.app/auth/callback`

(Svaki URL u listi u novom redu / kao poseban unos, zavisi od UI-a.)

### 6. Provera

1. `cd web` → `npm install` → `npm run dev`
2. Otvori `http://localhost:3000/signup`, napravi nalog.
3. U Supabase: **Table Editor** → `profiles` — trebalo bi da se pojavi red za tvog korisnika (trigger `handle_new_user`).

### 7. Produkcija (Vercel)

U Vercel **Environment Variables** dodaj iste varijable kao u `.env.local`, sa produkcijskim URL-om u `NEXT_PUBLIC_APP_URL` i istim Supabase URL/ključevima. U Supabase **URL Configuration** dodaj produkcijski `Site URL` i `Redirect URL` kao gore.

---

## Lokalno pokretanje

1. `cd web`
2. `.env.local` kao u odeljku Supabase iznad.
3. SQL šema iz `supabase/schema.sql` (ako si ranije imao staru šemu, pokreni i `supabase/migrations/20250322120000_paypal_enrollments.sql`).
4. PayPal ključevi u `.env.local` (vidi odeljak ispod).
5. `npm install` && `npm run dev`

## PayPal

1. [developer.paypal.com](https://developer.paypal.com) → **Apps & Credentials** → **Sandbox** (pa kasnije **Live**).
2. Kreiraj **REST API app** → kopiraj **Client ID** i **Secret** u `.env.local`:
   - `PAYPAL_CLIENT_ID`
   - `PAYPAL_CLIENT_SECRET`
   - `PAYPAL_ENV=sandbox` (za produkciju: `live` + live ključevi).
3. `NEXT_PUBLIC_APP_URL` mora biti isti kao URL na kom korisnik završava plaćanje (npr. `http://localhost:3000` lokalno, ili `https://tvoj-projekat.vercel.app` na Vercelu). PayPal redirectuje na `${APP_URL}/paypal/return`.
4. Sandbox test nalog: PayPal Developer → **Accounts** → test buyer.
5. Novac trenutno ide na **tvoj** PayPal business/sandbox merchant; automatska podela sa instruktorima (marketplace) zahteva PayPal Commerce Platform / odvojeni dogovor — u bazi se i dalje čuva `platform_fee_cents` i `instructor_earning_cents` za tvoju evidenciju i ručne isplate.

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

- **Root Directory** = `web`.
- Dodaj env varijable (Supabase + PayPal + `NEXT_PUBLIC_APP_URL` = produkcijski URL).
- U PayPal Live app podešavanjima dozvoli return URL: `https://tvoj-domen/paypal/return`.
