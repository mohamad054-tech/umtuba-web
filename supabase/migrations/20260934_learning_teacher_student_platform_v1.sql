-- UMTUBA Learning — Teacher + Student Platform V1
-- Additive. Become-a-Teacher lifecycle, course product fields, reviews,
-- earnings architecture placeholders, welcome-video hook config.
-- Does NOT: apply payments, invent commission %, auto-approve teachers,
-- issue certificates without completion, disable RLS, or connect providers.
--
-- Public/anon SELECT policies must NEVER call is_platform_admin().

-- ---------------------------------------------------------------------------
-- 1) Teacher profiles / applications
-- ---------------------------------------------------------------------------

create table if not exists public.learning_teacher_profiles (
  user_id uuid primary key
    references public.profiles (id) on delete cascade,
  display_name text not null
    constraint learning_teacher_profiles_name_len check (
      char_length(btrim(display_name)) between 2 and 80
    ),
  biography text
    constraint learning_teacher_profiles_bio_len check (
      biography is null or char_length(biography) <= 4000
    ),
  subjects text[] not null default '{}'::text[]
    constraint learning_teacher_profiles_subjects_len check (
      cardinality(subjects) <= 16
    ),
  teaching_languages text[] not null default '{}'::text[]
    constraint learning_teacher_profiles_langs_len check (
      cardinality(teaching_languages) <= 16
    ),
  experience_level text
    constraint learning_teacher_profiles_experience_check check (
      experience_level is null
      or experience_level in ('new', '1_3_years', '3_7_years', '7_plus_years')
    ),
  qualifications text
    constraint learning_teacher_profiles_qual_len check (
      qualifications is null or char_length(qualifications) <= 2000
    ),
  profile_image_url text
    constraint learning_teacher_profiles_image_len check (
      profile_image_url is null or char_length(profile_image_url) <= 2048
    ),
  teaching_description text
    constraint learning_teacher_profiles_desc_len check (
      teaching_description is null or char_length(teaching_description) <= 4000
    ),
  status text not null default 'draft'
    constraint learning_teacher_profiles_status_check check (
      status in ('draft', 'pending_review', 'approved', 'suspended', 'rejected')
    ),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewer_user_id uuid references public.profiles (id) on delete set null,
  review_note text
    constraint learning_teacher_profiles_note_len check (
      review_note is null or char_length(review_note) <= 2000
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.learning_teacher_profiles is
  'Teacher application + profile. Status changes to approved/suspended/rejected are admin-only. Clients cannot self-approve.';

drop trigger if exists learning_teacher_profiles_set_updated_at
  on public.learning_teacher_profiles;
create trigger learning_teacher_profiles_set_updated_at
  before update on public.learning_teacher_profiles
  for each row execute function public.set_row_updated_at();

alter table public.learning_teacher_profiles enable row level security;
alter table public.learning_teacher_profiles force row level security;

revoke all on table public.learning_teacher_profiles
  from public, anon, authenticated;
grant select on table public.learning_teacher_profiles to authenticated;
revoke insert, update, delete on table public.learning_teacher_profiles
  from authenticated;
grant all on table public.learning_teacher_profiles to service_role;

drop policy if exists "Teachers read own application"
  on public.learning_teacher_profiles;
create policy "Teachers read own application"
  on public.learning_teacher_profiles for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Public read approved teacher profiles"
  on public.learning_teacher_profiles;
create policy "Public read approved teacher profiles"
  on public.learning_teacher_profiles for select
  to anon, authenticated
  using (status = 'approved');

drop policy if exists "Platform admins read teacher applications"
  on public.learning_teacher_profiles;
create policy "Platform admins read teacher applications"
  on public.learning_teacher_profiles for select
  to authenticated
  using (public.is_platform_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- 2) Course product overlay (subtitle, access, future price)
-- ---------------------------------------------------------------------------

create table if not exists public.learning_teacher_course_products (
  course_id uuid primary key
    references public.learning_courses (id) on delete cascade,
  subtitle text
    constraint learning_teacher_course_products_subtitle_len check (
      subtitle is null or char_length(subtitle) <= 240
    ),
  prerequisites text
    constraint learning_teacher_course_products_prereq_len check (
      prerequisites is null or char_length(prerequisites) <= 2000
    ),
  learning_objectives text[] not null default '{}'::text[]
    constraint learning_teacher_course_products_objectives_len check (
      cardinality(learning_objectives) <= 16
    ),
  access_kind text not null default 'free'
    constraint learning_teacher_course_products_access_check check (
      access_kind in ('free', 'paid')
    ),
  future_price_amount_minor integer
    constraint learning_teacher_course_products_price_check check (
      future_price_amount_minor is null
      or future_price_amount_minor between 0 and 1000000000
    ),
  future_price_currency text
    constraint learning_teacher_course_products_currency_check check (
      future_price_currency is null
      or char_length(btrim(future_price_currency)) between 3 and 8
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.learning_teacher_course_products is
  'Teacher Center product overlay. Paid is a designation only — no payment capture. Commission % is unset.';

drop trigger if exists learning_teacher_course_products_set_updated_at
  on public.learning_teacher_course_products;
create trigger learning_teacher_course_products_set_updated_at
  before update on public.learning_teacher_course_products
  for each row execute function public.set_row_updated_at();

alter table public.learning_teacher_course_products enable row level security;
alter table public.learning_teacher_course_products force row level security;

revoke all on table public.learning_teacher_course_products
  from public, anon, authenticated;
grant select on table public.learning_teacher_course_products
  to anon, authenticated;
revoke insert, update, delete on table public.learning_teacher_course_products
  from anon, authenticated;
grant all on table public.learning_teacher_course_products to service_role;

drop policy if exists "Public read product of published public courses"
  on public.learning_teacher_course_products;
create policy "Public read product of published public courses"
  on public.learning_teacher_course_products for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.learning_courses c
      join public.learning_programs p on p.id = c.program_id
      join public.learning_spaces s on s.id = p.space_id
      where c.id = course_id
        and c.status = 'published'
        and c.visibility = 'public'
        and p.status = 'published'
        and p.visibility = 'public'
        and s.status = 'active'
        and s.visibility = 'public'
    )
  );

drop policy if exists "Managers read own course products"
  on public.learning_teacher_course_products;
create policy "Managers read own course products"
  on public.learning_teacher_course_products for select
  to authenticated
  using (public.can_manage_learning_course(course_id, auth.uid()));

-- ---------------------------------------------------------------------------
-- 3) Course reviews
-- ---------------------------------------------------------------------------

create table if not exists public.learning_course_reviews (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null
    references public.learning_courses (id) on delete cascade,
  user_id uuid not null
    references public.profiles (id) on delete cascade,
  rating integer not null
    constraint learning_course_reviews_rating_check check (
      rating between 1 and 5
    ),
  comment text
    constraint learning_course_reviews_comment_len check (
      comment is null or char_length(comment) <= 2000
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learning_course_reviews_user_course_unique unique (course_id, user_id)
);

comment on table public.learning_course_reviews is
  'Learner reviews for published courses. Inserts only via enrolled-learner RPC.';

drop trigger if exists learning_course_reviews_set_updated_at
  on public.learning_course_reviews;
create trigger learning_course_reviews_set_updated_at
  before update on public.learning_course_reviews
  for each row execute function public.set_row_updated_at();

alter table public.learning_course_reviews enable row level security;
alter table public.learning_course_reviews force row level security;

revoke all on table public.learning_course_reviews
  from public, anon, authenticated;
grant select on table public.learning_course_reviews to anon, authenticated;
revoke insert, update, delete on table public.learning_course_reviews
  from anon, authenticated;
grant all on table public.learning_course_reviews to service_role;

drop policy if exists "Public read reviews of published public courses"
  on public.learning_course_reviews;
create policy "Public read reviews of published public courses"
  on public.learning_course_reviews for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.learning_courses c
      where c.id = course_id
        and c.status = 'published'
        and c.visibility = 'public'
    )
  );

drop policy if exists "Learners read own reviews"
  on public.learning_course_reviews;
create policy "Learners read own reviews"
  on public.learning_course_reviews for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Managers read reviews of own courses"
  on public.learning_course_reviews;
create policy "Managers read reviews of own courses"
  on public.learning_course_reviews for select
  to authenticated
  using (public.can_manage_learning_course(course_id, auth.uid()));

-- ---------------------------------------------------------------------------
-- 4) Teacher earnings architecture (no money movement)
-- ---------------------------------------------------------------------------

create table if not exists public.learning_teacher_earnings_entries (
  id uuid primary key default gen_random_uuid(),
  teacher_user_id uuid not null
    references public.profiles (id) on delete cascade,
  course_id uuid references public.learning_courses (id) on delete set null,
  kind text not null
    constraint learning_teacher_earnings_kind_check check (
      kind in (
        'COURSE_PRICE',
        'GROSS_REVENUE',
        'PLATFORM_COMMISSION',
        'TEACHER_NET',
        'REFUNDS',
        'PAYOUT_PENDING',
        'PAYOUT_AVAILABLE',
        'PAYOUT_PAID'
      )
    ),
  amount_minor integer,
  currency text,
  source_reference text,
  created_at timestamptz not null default now()
);

comment on table public.learning_teacher_earnings_entries is
  'Teacher economics ledger architecture. No payment provider writes. Commission percent is unset and must not be invented.';

alter table public.learning_teacher_earnings_entries enable row level security;
alter table public.learning_teacher_earnings_entries force row level security;

revoke all on table public.learning_teacher_earnings_entries
  from public, anon, authenticated;
grant select on table public.learning_teacher_earnings_entries to authenticated;
revoke insert, update, delete on table public.learning_teacher_earnings_entries
  from authenticated;
grant all on table public.learning_teacher_earnings_entries to service_role;

drop policy if exists "Teachers read own earnings rows"
  on public.learning_teacher_earnings_entries;
create policy "Teachers read own earnings rows"
  on public.learning_teacher_earnings_entries for select
  to authenticated
  using (teacher_user_id = auth.uid());

drop policy if exists "Platform admins read teacher earnings"
  on public.learning_teacher_earnings_entries;
create policy "Platform admins read teacher earnings"
  on public.learning_teacher_earnings_entries for select
  to authenticated
  using (public.is_platform_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- 5) Welcome video hook config (optional, never mandatory)
-- ---------------------------------------------------------------------------

create table if not exists public.learning_welcome_video_hooks (
  id text primary key,
  source_url text,
  enabled boolean not null default false,
  mandatory boolean not null default false
    constraint learning_welcome_video_hooks_not_mandatory check (
      mandatory = false
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.learning_welcome_video_hooks (id, enabled, mandatory)
values ('learning-welcome-video', false, false)
on conflict (id) do nothing;

alter table public.learning_welcome_video_hooks enable row level security;
alter table public.learning_welcome_video_hooks force row level security;

revoke all on table public.learning_welcome_video_hooks
  from public, anon, authenticated;
grant select on table public.learning_welcome_video_hooks
  to anon, authenticated;
grant all on table public.learning_welcome_video_hooks to service_role;

drop policy if exists "Anyone reads welcome video hook"
  on public.learning_welcome_video_hooks;
create policy "Anyone reads welcome video hook"
  on public.learning_welcome_video_hooks for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- 6) Helpers + RPCs
-- ---------------------------------------------------------------------------

create or replace function public.is_approved_learning_teacher(
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_user_id is not null
    and exists (
      select 1
      from public.learning_teacher_profiles t
      where t.user_id = p_user_id
        and t.status = 'approved'
    );
$$;

revoke all on function public.is_approved_learning_teacher(uuid)
  from public, anon;
grant execute on function public.is_approved_learning_teacher(uuid)
  to authenticated, service_role;

create or replace function public.learning_teacher_profile_to_json(
  p_row public.learning_teacher_profiles,
  p_public boolean
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_public then
    return jsonb_build_object(
      'user_id', p_row.user_id,
      'display_name', p_row.display_name,
      'biography', p_row.biography,
      'subjects', p_row.subjects,
      'teaching_languages', p_row.teaching_languages,
      'experience_level', p_row.experience_level,
      'qualifications', p_row.qualifications,
      'profile_image_url', p_row.profile_image_url,
      'teaching_description', p_row.teaching_description,
      'status', p_row.status,
      'submitted_at', null,
      'reviewed_at', null,
      'reviewer_user_id', null,
      'review_note', null,
      'created_at', p_row.created_at,
      'updated_at', p_row.updated_at
    );
  end if;

  return jsonb_build_object(
    'user_id', p_row.user_id,
    'display_name', p_row.display_name,
    'biography', p_row.biography,
    'subjects', p_row.subjects,
    'teaching_languages', p_row.teaching_languages,
    'experience_level', p_row.experience_level,
    'qualifications', p_row.qualifications,
    'profile_image_url', p_row.profile_image_url,
    'teaching_description', p_row.teaching_description,
    'status', p_row.status,
    'submitted_at', p_row.submitted_at,
    'reviewed_at', p_row.reviewed_at,
    'reviewer_user_id', p_row.reviewer_user_id,
    'review_note', p_row.review_note,
    'created_at', p_row.created_at,
    'updated_at', p_row.updated_at
  );
end;
$$;

revoke all on function public.learning_teacher_profile_to_json(public.learning_teacher_profiles, boolean)
  from public, anon;
grant execute on function public.learning_teacher_profile_to_json(public.learning_teacher_profiles, boolean)
  to authenticated, service_role;

create or replace function public.get_my_learning_teacher_profile()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.learning_teacher_profiles%rowtype;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select * into v_row
  from public.learning_teacher_profiles
  where user_id = v_uid;

  if not found then
    return null;
  end if;

  return public.learning_teacher_profile_to_json(v_row, false);
end;
$$;

revoke all on function public.get_my_learning_teacher_profile()
  from public, anon;
grant execute on function public.get_my_learning_teacher_profile()
  to authenticated, service_role;

create or replace function public.save_learning_teacher_profile_draft(
  p_display_name text,
  p_biography text default null,
  p_subjects text[] default '{}'::text[],
  p_teaching_languages text[] default '{}'::text[],
  p_experience_level text default null,
  p_qualifications text default null,
  p_profile_image_url text default null,
  p_teaching_description text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.learning_teacher_profiles%rowtype;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select * into v_row
  from public.learning_teacher_profiles
  where user_id = v_uid
  for update;

  if found and v_row.status not in ('draft', 'rejected') then
    raise exception 'Cannot edit application in current status';
  end if;

  insert into public.learning_teacher_profiles (
    user_id,
    display_name,
    biography,
    subjects,
    teaching_languages,
    experience_level,
    qualifications,
    profile_image_url,
    teaching_description,
    status
  ) values (
    v_uid,
    btrim(p_display_name),
    nullif(btrim(coalesce(p_biography, '')), ''),
    coalesce(p_subjects, '{}'::text[]),
    coalesce(p_teaching_languages, '{}'::text[]),
    nullif(p_experience_level, ''),
    nullif(btrim(coalesce(p_qualifications, '')), ''),
    nullif(btrim(coalesce(p_profile_image_url, '')), ''),
    nullif(btrim(coalesce(p_teaching_description, '')), ''),
    'draft'
  )
  on conflict (user_id) do update
    set display_name = excluded.display_name,
        biography = excluded.biography,
        subjects = excluded.subjects,
        teaching_languages = excluded.teaching_languages,
        experience_level = excluded.experience_level,
        qualifications = excluded.qualifications,
        profile_image_url = excluded.profile_image_url,
        teaching_description = excluded.teaching_description,
        status = case
          when public.learning_teacher_profiles.status in ('draft', 'rejected')
            then 'draft'
          else public.learning_teacher_profiles.status
        end,
        reviewed_at = case
          when public.learning_teacher_profiles.status = 'rejected' then null
          else public.learning_teacher_profiles.reviewed_at
        end
  returning * into v_row;

  return public.learning_teacher_profile_to_json(v_row, false);
end;
$$;

revoke all on function public.save_learning_teacher_profile_draft(text, text, text[], text[], text, text, text, text)
  from public, anon;
grant execute on function public.save_learning_teacher_profile_draft(text, text, text[], text[], text, text, text, text)
  to authenticated, service_role;

create or replace function public.submit_learning_teacher_application()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.learning_teacher_profiles%rowtype;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select * into v_row
  from public.learning_teacher_profiles
  where user_id = v_uid
  for update;

  if not found then
    raise exception 'Cannot submit empty application';
  end if;

  if v_row.status not in ('draft', 'rejected') then
    raise exception 'Cannot submit application in current status';
  end if;

  if char_length(btrim(coalesce(v_row.biography, ''))) < 8
     or char_length(btrim(coalesce(v_row.teaching_description, ''))) < 8
     or cardinality(v_row.subjects) < 1
     or cardinality(v_row.teaching_languages) < 1 then
    raise exception 'Cannot submit incomplete application';
  end if;

  update public.learning_teacher_profiles
     set status = 'pending_review',
         submitted_at = now(),
         reviewed_at = null,
         reviewer_user_id = null
   where user_id = v_uid
  returning * into v_row;

  return public.learning_teacher_profile_to_json(v_row, false);
end;
$$;

revoke all on function public.submit_learning_teacher_application()
  from public, anon;
grant execute on function public.submit_learning_teacher_application()
  to authenticated, service_role;

create or replace function public.get_public_learning_teacher_profile(
  p_user_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_row public.learning_teacher_profiles%rowtype;
begin
  if p_user_id is null then
    return null;
  end if;

  select * into v_row
  from public.learning_teacher_profiles
  where user_id = p_user_id
    and status = 'approved';

  if not found then
    return null;
  end if;

  return public.learning_teacher_profile_to_json(v_row, true);
end;
$$;

revoke all on function public.get_public_learning_teacher_profile(uuid)
  from public;
grant execute on function public.get_public_learning_teacher_profile(uuid)
  to anon, authenticated, service_role;

create or replace function public.moderate_learning_teacher_application(
  p_user_id uuid,
  p_status text,
  p_review_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.learning_teacher_profiles%rowtype;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_platform_admin(v_uid) then
    raise exception 'Not allowed';
  end if;

  if p_status not in ('approved', 'rejected', 'suspended', 'pending_review') then
    raise exception 'Invalid moderation status';
  end if;

  update public.learning_teacher_profiles
     set status = p_status,
         reviewed_at = now(),
         reviewer_user_id = v_uid,
         review_note = nullif(btrim(coalesce(p_review_note, '')), '')
   where user_id = p_user_id
  returning * into v_row;

  if not found then
    raise exception 'Teacher application not found';
  end if;

  return public.learning_teacher_profile_to_json(v_row, false);
end;
$$;

revoke all on function public.moderate_learning_teacher_application(uuid, text, text)
  from public, anon;
grant execute on function public.moderate_learning_teacher_application(uuid, text, text)
  to authenticated, service_role;

create or replace function public.upsert_learning_teacher_course_product(
  p_course_id uuid,
  p_subtitle text default null,
  p_prerequisites text default null,
  p_learning_objectives text[] default '{}'::text[],
  p_access_kind text default 'free',
  p_future_price_amount_minor integer default null,
  p_future_price_currency text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.learning_teacher_course_products%rowtype;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if not public.can_manage_learning_course(p_course_id, v_uid) then
    raise exception 'Not allowed';
  end if;

  if p_access_kind not in ('free', 'paid') then
    raise exception 'Invalid access kind';
  end if;

  insert into public.learning_teacher_course_products (
    course_id,
    subtitle,
    prerequisites,
    learning_objectives,
    access_kind,
    future_price_amount_minor,
    future_price_currency
  ) values (
    p_course_id,
    nullif(btrim(coalesce(p_subtitle, '')), ''),
    nullif(btrim(coalesce(p_prerequisites, '')), ''),
    coalesce(p_learning_objectives, '{}'::text[]),
    p_access_kind,
    case when p_access_kind = 'paid' then p_future_price_amount_minor else null end,
    case
      when p_access_kind = 'paid'
        then coalesce(nullif(btrim(coalesce(p_future_price_currency, '')), ''), 'USD')
      else null
    end
  )
  on conflict (course_id) do update
    set subtitle = excluded.subtitle,
        prerequisites = excluded.prerequisites,
        learning_objectives = excluded.learning_objectives,
        access_kind = excluded.access_kind,
        future_price_amount_minor = excluded.future_price_amount_minor,
        future_price_currency = excluded.future_price_currency
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

revoke all on function public.upsert_learning_teacher_course_product(uuid, text, text, text[], text, integer, text)
  from public, anon;
grant execute on function public.upsert_learning_teacher_course_product(uuid, text, text, text[], text, integer, text)
  to authenticated, service_role;

create or replace function public.get_learning_teacher_course_product(
  p_course_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.learning_teacher_course_products%rowtype;
  v_public boolean;
begin
  select *
    into v_row
    from public.learning_teacher_course_products
   where course_id = p_course_id;

  if not found then
    return null;
  end if;

  select
    c.status = 'published'
    and c.visibility = 'public'
    into v_public
  from public.learning_courses c
  where c.id = p_course_id;

  if coalesce(v_public, false)
     or (v_uid is not null and public.can_manage_learning_course(p_course_id, v_uid))
  then
    return to_jsonb(v_row);
  end if;

  return null;
end;
$$;

revoke all on function public.get_learning_teacher_course_product(uuid)
  from public;
grant execute on function public.get_learning_teacher_course_product(uuid)
  to anon, authenticated, service_role;

create or replace function public.upsert_learning_course_review(
  p_course_id uuid,
  p_rating integer,
  p_comment text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.learning_course_reviews%rowtype;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_rating < 1 or p_rating > 5 then
    raise exception 'Invalid rating';
  end if;

  if not public.has_learning_course_access(p_course_id, v_uid) then
    raise exception 'Not allowed';
  end if;

  if public.can_manage_learning_course(p_course_id, v_uid) then
    raise exception 'Teachers cannot review their own courses';
  end if;

  insert into public.learning_course_reviews (
    course_id,
    user_id,
    rating,
    comment
  ) values (
    p_course_id,
    v_uid,
    p_rating,
    nullif(btrim(coalesce(p_comment, '')), '')
  )
  on conflict (course_id, user_id) do update
    set rating = excluded.rating,
        comment = excluded.comment
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

revoke all on function public.upsert_learning_course_review(uuid, integer, text)
  from public, anon;
grant execute on function public.upsert_learning_course_review(uuid, integer, text)
  to authenticated, service_role;

create or replace function public.list_public_learning_course_reviews(
  p_course_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.learning_courses c
    where c.id = p_course_id
      and c.status = 'published'
      and c.visibility = 'public'
  ) then
    return '[]'::jsonb;
  end if;

  return coalesce(
    (
      select jsonb_agg(to_jsonb(r) - 'user_id' || jsonb_build_object('user_id', null) order by r.created_at desc)
      from public.learning_course_reviews r
      where r.course_id = p_course_id
    ),
    '[]'::jsonb
  );
end;
$$;

revoke all on function public.list_public_learning_course_reviews(uuid)
  from public;
grant execute on function public.list_public_learning_course_reviews(uuid)
  to anon, authenticated, service_role;

create or replace function public.list_my_teaching_course_reviews()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  return coalesce(
    (
      select jsonb_agg(to_jsonb(r) order by r.created_at desc)
      from public.learning_course_reviews r
      where public.can_manage_learning_course(r.course_id, v_uid)
    ),
    '[]'::jsonb
  );
end;
$$;

revoke all on function public.list_my_teaching_course_reviews()
  from public, anon;
grant execute on function public.list_my_teaching_course_reviews()
  to authenticated, service_role;
