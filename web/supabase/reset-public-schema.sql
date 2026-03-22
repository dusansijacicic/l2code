-- Opcija B: skini app šemu iz public, pa u novom upitu pokreni ceo web/supabase/schema.sql
-- Briše sve redove u kursima / upisima / progresu. auth.users ostaje — postojeći nalogi nemaju
-- automatski novi red u profiles dok se ponovo ne registruju (trigger radi samo na novi insert).

-- 1) Trigger na auth (mora prvo)
drop trigger if exists on_auth_user_created on auth.users;

-- 2) Tabele od zavisnih ka roditeljima (RLS politike padaju sa tabelama)
drop table if exists public.lesson_progress cascade;
drop table if exists public.enrollments cascade;
drop table if exists public.lesson_tasks cascade;
drop table if exists public.lesson_video_secrets cascade;
drop table if exists public.course_lessons cascade;
drop table if exists public.course_modules cascade;
drop table if exists public.courses cascade;
drop table if exists public.profiles cascade;

-- 3) Funkcije iz schema.sql
drop function if exists public.handle_new_user () cascade;
drop function if exists public.set_updated_at () cascade;
drop function if exists public.list_instructor_public () cascade;
drop function if exists public.get_instructor_public (uuid) cascade;
