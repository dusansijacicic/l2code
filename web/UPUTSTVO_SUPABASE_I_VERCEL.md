# Uputstvo: Supabase i Vercel (detaljno)

Ovaj dokument objašnjava **kompletan setup** baze i autentifikacije (Supabase) i hostinga (Vercel) za aplikaciju **Kursevi** u folderu `web/`.

---

## Sadržaj

1. [Šta ti treba pre nego što kreneš](#šta-ti-treba-pre-nego-što-kreneš)
2. [Deo A — Supabase](#deo-a--supabase)
3. [Deo B — Vercel](#deo-b--vercel)
4. [Povezivanje nakon deploy-a](#povezivanje-nakon-deploy-a)
5. [Česta pitanja i greške](#česta-pitanja-i-greške)

---

## Šta ti treba pre nego što kreneš

- Nalog na [supabase.com](https://supabase.com).
- Nalog na [vercel.com](https://vercel.com) (najčešće povezan sa GitHub nalogom).
- Repozitorijum sa kodom (npr. `github.com/dusansijacicic/l2code`) — Next.js aplikacija je u podfolderu **`web/`**, ne u korenu repoa.

---

# Deo A — Supabase

## A1. Kreiranje projekta

1. Uloguj se na [Supabase Dashboard](https://supabase.com/dashboard).
2. Klikni **New project** (ili **Start your project**).
3. Izaberi **Organization** (možeš koristiti ličnu).
4. Polja:
   - **Name**: npr. `kursevi-prod` ili `kursevi-dev`.
   - **Database Password**: jaka lozinka — **obavezno je sačuvaj** (menadžer lozinki). Koristi se za direktan pristup Postgresu (retko za ovu aplikaciju, ali treba za backup).
   - **Region**: izaberi geografski najbliži region korisnicima (za Srbiju/EU često **Frankfurt** ili **London**).
5. Klikni **Create new project** i sačekaj 1–3 minuta dok se ne pojavi „Project is ready“.

## A2. Gde se nalaze API ključevi

1. U projektu, levo dole ili gore: **Project Settings** (ikona zupčanika).
2. U meniju Settings izaberi **API**.

Videćeš:

| Naziv na dashboardu | Gde ga koristiš u aplikaciji |
|---------------------|------------------------------|
| **Project URL** | `NEXT_PUBLIC_SUPABASE_URL` |
| **Project API keys → `anon` `public`** | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **Project API keys → `service_role` `secret`** | `SUPABASE_SERVICE_ROLE_KEY` |

**Važno:**

- **`anon`** ključ je u browseru (bezbedan uz RLS). Može da stoji u `.env.local` i u Vercel env kao `NEXT_PUBLIC_*`.
- **`service_role`** zaobilazi RLS. Koristi ga **samo na serveru** (API rute, webhook). **Nikad** ga ne stavljaj u React komponente, ne komituj u Git, ne objavljuj javno.

## A3. Lokalni `.env.local`

1. U folderu `web` napravi fajl **`.env.local`** (isti folder gde je `package.json`).
2. Najlakše: kopiraj `web/.env.example` u `.env.local` i zameni placeholder vrednosti.

Primer (tvoje vrednosti umesto `xxxx`):

```env
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_APP_URL=http://localhost:3000

SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

PayPal i video ključeve možeš dodati kasnije; za čisto testiranje Supabase + login dovoljno je gore navedeno.

## A4. Šema baze (tabele, RLS, trigger)

1. U Supabase levom meniju: **SQL Editor**.
2. **New query**.
3. Na svom računaru otvori fajl **`web/supabase/schema.sql`**, selektuj **ceo** sadržaj, kopiraj, nalepi u SQL Editor.
4. Klikni **Run** (ili Ctrl+Enter).

Očekivano: poruka da je upit uspešan, bez crvenih grešaka.

**Ako vidiš grešku na triggeru** za `auth.users`, tipa „syntax error“ oko `execute function`:

- U fajlu `schema.sql` pronađi liniju sa `execute function public.handle_new_user ()`.
- Zameni je sa: `execute procedure public.handle_new_user ()`
- Ponovo pokreni **ceo** skript (ili samo deo oko triggera, ako već imaš tabele — za čist projekat lakše je obrisati projekat i ponovo, ili ručno dropovati objekte; za početnike najjednostavnije: novi Supabase projekat i jedan Run celog fajla posle ispravke).

## A5. Autentifikacija — Email

1. Meni **Authentication** → **Providers**.
2. Pronađi **Email** → uključi **Enable Email provider** (ako nije).
3. Opcije:
   - **Confirm email**: za produkciju obično **uključeno** (korisnik mora kliknuti link u mejlu).
   - Za **brzo lokalno testiranje** možeš privremeno **isključiti** „Confirm email“ da odmah možeš da se uloguješ posle signup-a (vrati uključeno pre pravog lansiranja).

## A6. URL-ovi za OAuth / email redirect (obavezno)

Bez ovoga login sa mejlom i magic link neće ispravno vratiti korisnika u aplikaciju.

1. **Authentication** → **URL Configuration**.

Popuni:

| Polje | Vrednost za lokalni razvoj |
|-------|----------------------------|
| **Site URL** | `http://localhost:3000` |

**Redirect URLs** — dodaj bar jednu liniju:

```
http://localhost:3000/auth/callback
```

U novijem UI-u često postoji lista URL-ova: klikni **Add URL** i unesi gornji string tačno (bez razmaka na kraju).

**Kada deployuješ na Vercel**, ovde moraš **dodati i** produkcijski callback, npr.:

```
https://ime-projekta.vercel.app/auth/callback
```

i eventualno custom domen:

```
https://tvojdomen.rs/auth/callback
```

**Site URL** u produkciji mnogi postave na glavni URL sajta (npr. `https://tvojdomen.rs`).

## A7. Provera da Supabase radi sa aplikacijom

1. Terminal: `cd web` → `npm install` → `npm run dev`.
2. Browser: `http://localhost:3000/signup` — registruj test korisnika.
3. Supabase: **Table Editor** → tabela **`profiles`** — treba da postoji red sa tvojim `id` (isti kao u **Authentication** → **Users**). To pravi trigger iz `schema.sql` posle registracije.

Ako `profiles` ostane prazan, proveri da li je trigger uspešno kreiran i da li SQL uopšte prošao do kraja.

---

# Deo B — Vercel

Aplikacija nije u korenu Git repozitorijuma, već u **`web/`**. Na Vercelu moraš to eksplicitno podesiti.

## B1. Import projekta sa GitHuba

1. Uloguj se na [vercel.com](https://vercel.com/dashboard).
2. **Add New…** → **Project**.
3. **Import Git Repository** — izaberi npr. `dusansijacicic/l2code` (ili Connect ako prvi put povezuješ GitHub i odobri pristup repou).
4. Klikni **Import**.

## B2. Root Directory = `web` (ključno)

Na ekranu **Configure Project**:

1. Pronađi polje **Root Directory** (ponekad pod **Edit** pored Framework Preset).
2. Klikni **Edit** i izaberi folder **`web`** iz repozitorijuma (ili ukucaj `web`).
3. Framework: Vercel obično detektuje **Next.js** — ostavi tako.

Zbog ovoga:

- **Build Command** ostaje podrazumevano: `next build` (izvršava se unutar `web/`).
- **Output** Next.js rešava sam.

Ne postavljaj Root na koren repoa ako tamo nema `package.json` za Next — build će pasti.

## B3. Build i Node

- **Install Command**: `npm install` (podrazumevano).
- **Build Command**: `npm run build` (podrazumevano za Next u `web/`).

Ako Vercel ponudi Node verziju, **Node 20.x** ili novija LTS je u redu za Next 16.

## B4. Environment Variables na Vercelu

U istom koraku **Configure Project** (pre prvog Deploy) ili kasnije: **Project** → **Settings** → **Environment Variables**.

Dodaj sledeće (imena moraju da se poklapaju tačno sa kodom):

| Ime | Okruženje | Opis |
|-----|-----------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview, Development | Isti URL kao u Supabase Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview, Development | `anon` `public` ključ |
| `NEXT_PUBLIC_APP_URL` | **Production** | Pun URL deploya, npr. `https://l2code.vercel.app` |
| `NEXT_PUBLIC_APP_URL` | **Preview** | Može privremeno isti kao Production ili ostaviti Preview URL ako u kodu koristiš dinamički origin — za ovu app najčešće za Preview staviš konkretan preview URL nakon prvog deploya ili koristiš Production vrednost za test |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview, Development | `service_role` — **samo server** |

**Preporuka za `NEXT_PUBLIC_APP_URL`:**

- Posle **prvog** uspešnog deploya kopiraš URL projekta (npr. `https://something.vercel.app`) i staviš ga kao `NEXT_PUBLIC_APP_URL` za **Production**, pa **Redeploy** (PayPal `return_url` mora da se poklapa sa ovim domenom + `/paypal/return`).

**PayPal (obavezno za kupovinu kurseva):**

| Ime | Napomena |
|-----|----------|
| `PAYPAL_CLIENT_ID` | [developer.paypal.com](https://developer.paypal.com) → Apps & Credentials |
| `PAYPAL_CLIENT_SECRET` | Isti ekran (Secret) |
| `PAYPAL_ENV` | `sandbox` za test, `live` za produkciju |

Opciono (video):

| Ime | Napomena |
|-----|----------|
| `MUX_SIGNED_PLAYBACK_BASE_URL` | Kad podesiš Mux |
| `CF_STREAM_CUSTOMER_SUBDOMAIN` | Kad podesiš Cloudflare Stream |

**Šta NE commituješ:** fajl `.env.local` ostaje samo na računaru; na Vercelu sve env varijable unosiš kroz dashboard.

## B5. Deploy

1. Klikni **Deploy**.
2. Sačekaj build log — treba da završi sa „Ready“.
3. Otvori generisani URL (npr. `https://l2code.vercel.app`).

Ako build padne, proveri log: najčešće **pogrešan Root Directory** (nije `web`) ili nedostaje env varijabla koju zahteva kod pri buildu (npr. ako negde sinhrono čitaš env bez fallbacka).

## B6. Ponovni deploy posle izmene env varijabli

Kod **Next.js** neke vrednosti `NEXT_PUBLIC_*` ulaze u bundle pri buildu.

- Posle promene `NEXT_PUBLIC_*` na Vercelu uradi **Redeploy** (Deployments → tri tačke na poslednjem → Redeploy).

## B7. Custom domen (opciono)

1. **Project** → **Settings** → **Domains**.
2. Dodaj domen, prati DNS instrukcije (CNAME / A zapis).
3. Ažuriraj u Supabase **Site URL** i **Redirect URLs** na `https://tvojdomen.rs` i `https://tvojdomen.rs/auth/callback`.
4. Ažuriraj `NEXT_PUBLIC_APP_URL` na Vercelu na isti HTTPS URL i redeploy.

---

# Povezivanje nakon deploy-a

Redosled koji smisleno radi:

1. Supabase projekat + SQL šema + Auth URL-ovi (lokalno testirano).
2. Vercel projekat sa **Root Directory `web`** + env varijable.
3. Prvi deploy → kopiraj produkcijski URL.
4. U Supabase **URL Configuration** dodaj produkcijski `auth/callback` i podesi **Site URL** na produkciju.
5. Na Vercelu postavi `NEXT_PUBLIC_APP_URL` na taj URL → **Redeploy**.
6. Test: produkcijski sajt → Registracija / Prijava.

Za **PayPal** u produkciji:

1. U PayPal Developer pređi na **Live** aplikaciju i live Client ID / Secret na Vercel (`PAYPAL_ENV=live`).
2. U PayPal app podešavanjima (gde god traži return URL) dozvoli: `https://tvoj-domen.vercel.app/paypal/return`.
3. `NEXT_PUBLIC_APP_URL` na Vercelu mora biti isti kao glavni URL sajta (bez `/` na kraju).

---

# Česta pitanja i greške

**„Invalid API key“ / 401 na Supabase**  
Proveri da li su URL i `anon` ključ iskopirani celi, bez razmaka; da li su na Vercelu dodeljeni i Production i Preview ako testiraš preview link.

**Login me vraća na localhost**  
`Site URL` i `Redirect URLs` u Supabase moraju da sadrže tačan URL gde trenutno koristiš app (lokal ili Vercel).

**Plaćanje / enrollments ne rade**  
Proveri PayPal sandbox nalog, `PAYPAL_*` env na Vercelu i da si u Supabase pokrenuo migraciju sa `paypal_order_id` kolonama (`supabase/migrations/20250322120000_paypal_enrollments.sql` ako je baza starija). Upis u `enrollments` ide preko `SUPABASE_SERVICE_ROLE_KEY` na stranici `/paypal/return` posle uspešnog capture-a.

**Build: Cannot find module**  
Pokreni lokalno `cd web && npm run build` — ako tamo radi, na Vercelu skoro sigurno **Root Directory** mora biti `web`.

---

Kraći pregled funkcija aplikacije i strukture foldera: [README.md](./README.md).
