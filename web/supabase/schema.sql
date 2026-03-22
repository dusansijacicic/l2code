-- Kursevi marketplace — pokreni u Supabase SQL Editor
-- Auth: uključi Email provider; Site URL i Redirect URLs za /auth/callback

create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  role text not null default 'student' check (role in ('student', 'instructor', 'admin')),
  bio text,
  stripe_connect_account_id text,
  instructor_payout_ready boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Javni podaci o instruktoru (bez emaila) — RPC jer RLS na profiles skriva tuđe redove
create or replace function public.list_instructor_public ()
returns table (
  id uuid,
  full_name text,
  avatar_url text,
  bio text
)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.full_name, p.avatar_url, p.bio
  from public.profiles p
  where p.role in ('instructor', 'admin');
$$;

grant execute on function public.list_instructor_public () to anon, authenticated;

create or replace function public.get_instructor_public (target_id uuid)
returns table (
  id uuid,
  full_name text,
  avatar_url text,
  bio text
)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.full_name, p.avatar_url, p.bio
  from public.profiles p
  where p.id = target_id and p.role in ('instructor', 'admin');
$$;

grant execute on function public.get_instructor_public (uuid) to anon, authenticated;

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references public.profiles (id) on delete restrict,
  slug text not null unique,
  title text not null,
  subtitle text,
  description text,
  thumbnail_url text,
  price_cents integer not null default 0 check (price_cents >= 0),
  currency text not null default 'eur',
  platform_fee_bps integer not null default 2000 check (platform_fee_bps >= 0 and platform_fee_bps <= 10000),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index courses_instructor_idx on public.courses (instructor_id);
create index courses_status_published_idx on public.courses (status) where status = 'published';

create table public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null,
  sort_order integer not null default 0
);

create index course_modules_course_idx on public.course_modules (course_id);

-- Javni metapodaci lekcije (naslovi, trajanje) — bez video ID
create table public.course_lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.course_modules (id) on delete cascade,
  title text not null,
  description text,
  sort_order integer not null default 0,
  duration_seconds integer,
  is_preview boolean not null default false
);

create index course_lessons_module_idx on public.course_lessons (module_id);

-- Video identifikatori — samo instruktor i upisani polaznici (server proverava enrollment)
create table public.lesson_video_secrets (
  lesson_id uuid primary key references public.course_lessons (id) on delete cascade,
  video_provider text not null check (video_provider in ('mux', 'cloudflare_stream', 'bunny', 'supabase_storage')),
  video_asset_id text not null
);

create table public.lesson_tasks (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.course_lessons (id) on delete cascade,
  title text not null,
  body text,
  sort_order integer not null default 0
);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  paypal_order_id text,
  paypal_capture_id text,
  amount_paid_cents integer,
  platform_fee_cents integer,
  instructor_earning_cents integer,
  currency text,
  created_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create index enrollments_user_idx on public.enrollments (user_id);
create index enrollments_course_idx on public.enrollments (course_id);

create table public.lesson_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.course_lessons (id) on delete cascade,
  progress_percent smallint not null default 0 check (progress_percent >= 0 and progress_percent <= 100),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create or replace function public.handle_new_user ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user ();

create or replace function public.set_updated_at ()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at ();
create trigger courses_updated_at before update on public.courses
  for each row execute function public.set_updated_at ();
create trigger lesson_progress_updated_at before update on public.lesson_progress
  for each row execute function public.set_updated_at ();

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.course_modules enable row level security;
alter table public.course_lessons enable row level security;
alter table public.lesson_video_secrets enable row level security;
alter table public.lesson_tasks enable row level security;
alter table public.enrollments enable row level security;
alter table public.lesson_progress enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

create policy "courses_select_published" on public.courses
  for select using (status = 'published');
create policy "courses_select_enrolled" on public.courses
  for select using (
    exists (
      select 1 from public.enrollments e
      where e.course_id = courses.id and e.user_id = auth.uid()
    )
  );
create policy "courses_select_own" on public.courses
  for select using (auth.uid() = instructor_id);
create policy "courses_insert_instructor" on public.courses
  for insert with check (auth.uid() = instructor_id);
create policy "courses_update_own" on public.courses
  for update using (auth.uid() = instructor_id);
create policy "courses_delete_own" on public.courses
  for delete using (auth.uid() = instructor_id);

create policy "modules_select" on public.course_modules
  for select using (
    exists (
      select 1 from public.courses c
      where c.id = course_modules.course_id
        and (
          c.status = 'published'
          or c.instructor_id = auth.uid()
          or exists (
            select 1 from public.enrollments e
            where e.course_id = c.id and e.user_id = auth.uid()
          )
        )
    )
  );
create policy "modules_mutate_instructor" on public.course_modules
  for all using (
    exists (
      select 1 from public.courses c
      where c.id = course_modules.course_id and c.instructor_id = auth.uid()
    )
  );

-- Outline lekcija: published (svi) ili instruktor; upisani vide sve lekcije kursa
create policy "lessons_select" on public.course_lessons
  for select using (
    exists (
      select 1 from public.course_modules m
      join public.courses c on c.id = m.course_id
      where m.id = course_lessons.module_id
        and (
          c.status = 'published'
          or c.instructor_id = auth.uid()
          or exists (
            select 1 from public.enrollments e
            where e.course_id = c.id and e.user_id = auth.uid()
          )
        )
    )
  );
create policy "lessons_mutate_instructor" on public.course_lessons
  for all using (
    exists (
      select 1 from public.course_modules m
      join public.courses c on c.id = m.course_id
      where m.id = course_lessons.module_id and c.instructor_id = auth.uid()
    )
  );

create policy "video_secrets_select" on public.lesson_video_secrets
  for select using (
    exists (
      select 1 from public.course_lessons l
      join public.course_modules m on m.id = l.module_id
      join public.courses c on c.id = m.course_id
      where l.id = lesson_video_secrets.lesson_id
        and (
          c.instructor_id = auth.uid()
          or exists (
            select 1 from public.enrollments e
            where e.course_id = c.id and e.user_id = auth.uid()
          )
        )
    )
  );
create policy "video_secrets_mutate_instructor" on public.lesson_video_secrets
  for all using (
    exists (
      select 1 from public.course_lessons l
      join public.course_modules m on m.id = l.module_id
      join public.courses c on c.id = m.course_id
      where l.id = lesson_video_secrets.lesson_id and c.instructor_id = auth.uid()
    )
  );

create policy "tasks_select" on public.lesson_tasks
  for select using (
    exists (
      select 1 from public.course_lessons l
      join public.course_modules m on m.id = l.module_id
      join public.courses c on c.id = m.course_id
      where l.id = lesson_tasks.lesson_id
        and (
          c.instructor_id = auth.uid()
          or exists (select 1 from public.enrollments e where e.course_id = c.id and e.user_id = auth.uid())
          or (c.status = 'published' and l.is_preview)
        )
    )
  );

create policy "tasks_mutate_instructor" on public.lesson_tasks
  for all using (
    exists (
      select 1 from public.course_lessons l
      join public.course_modules m on m.id = l.module_id
      join public.courses c on c.id = m.course_id
      where l.id = lesson_tasks.lesson_id and c.instructor_id = auth.uid()
    )
  );

create policy "enrollments_select_own" on public.enrollments
  for select using (auth.uid() = user_id);
create policy "enrollments_select_instructor" on public.enrollments
  for select using (
    exists (
      select 1 from public.courses c
      where c.id = enrollments.course_id and c.instructor_id = auth.uid()
    )
  );
-- Upisi kreira samo backend (PayPal return + service role; opciono webhook)

create policy "progress_select_own" on public.lesson_progress
  for select using (auth.uid() = user_id);
create policy "progress_upsert_own" on public.lesson_progress
  for insert with check (auth.uid() = user_id);
create policy "progress_update_own" on public.lesson_progress
  for update using (auth.uid() = user_id);
create policy "progress_select_instructor" on public.lesson_progress
  for select using (
    exists (
      select 1 from public.course_lessons l
      join public.course_modules m on m.id = l.module_id
      join public.courses c on c.id = m.course_id
      where l.id = lesson_progress.lesson_id and c.instructor_id = auth.uid()
    )
  );
