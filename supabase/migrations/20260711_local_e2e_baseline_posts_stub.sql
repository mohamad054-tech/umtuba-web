-- LOCAL E2E ONLY — greenfield bootstrap for historical migrations that assume
-- a pre-existing public.posts table (production baseline not in repo).
-- Safe no-op if posts already exists. Do not apply to production as a product change.

create table if not exists public.posts (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid references auth.users (id) on delete set null,
  post_type text,
  caption text,
  image_path text,
  likes integer not null default 0,
  comments integer not null default 0,
  shares integer not null default 0,
  saves integer not null default 0,
  views integer not null default 0
);
