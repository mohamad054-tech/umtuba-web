-- =============================================================================
-- UM Learning OS — Discussions & Course Community Foundation V1
-- Migration: 20260858_learning_discussions_community_foundation_v1.sql
--
-- Course community: discussions, Q&A, announcements, feed, moderation.
-- Reuses spaces/courses/access/staff/auth/notifications/profiles/audit.
-- Does NOT: realtime chat, messaging, live rooms, AI, analytics, push redesign.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0) Notification types
-- ---------------------------------------------------------------------------

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check check (
    type in (
      'follow',
      'post_like',
      'comment',
      'reply',
      'mention',
      'live_started',
      'direct_message',
      'post_reached_country',
      'post_trending_country',
      'post_milestone',
      'post_journey_summary',
      'um_points_earned',
      'reward_milestone',
      'nearby_live_started',
      'ai_creator_insight',
      'post_save',
      'post_share',
      'referral_reward',
      'learning_course_completed',
      'learning_announcement_posted',
      'learning_discussion_reply',
      'learning_qa_answered'
    )
  );

-- ---------------------------------------------------------------------------
-- 1) Tables
-- ---------------------------------------------------------------------------

create table if not exists public.learning_discussion_threads (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.learning_spaces (id) on delete restrict,
  course_id uuid not null references public.learning_courses (id) on delete restrict,
  author_id uuid not null references public.profiles (id) on delete restrict,
  title text not null
    constraint learning_discussion_threads_title_len check (
      char_length(btrim(title)) between 1 and 200
    ),
  body text not null
    constraint learning_discussion_threads_body_len check (
      char_length(body) between 1 and 20000
    ),
  status text not null default 'open'
    constraint learning_discussion_threads_status_check check (
      status in ('open', 'locked', 'archived', 'removed')
    ),
  locked_at timestamptz,
  locked_by uuid references public.profiles (id) on delete set null,
  archived_at timestamptz,
  archived_by uuid references public.profiles (id) on delete set null,
  removed_at timestamptz,
  removed_by uuid references public.profiles (id) on delete set null,
  removal_reason text
    constraint learning_discussion_threads_removal_reason_len check (
      removal_reason is null or char_length(removal_reason) <= 500
    ),
  edited_at timestamptz,
  reply_count integer not null default 0
    constraint learning_discussion_threads_reply_count_nonneg check (reply_count >= 0),
  last_reply_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists learning_discussion_threads_course_status_idx
  on public.learning_discussion_threads (
    course_id, status, last_reply_at desc nulls last, created_at desc
  );

create trigger learning_discussion_threads_set_updated_at
  before update on public.learning_discussion_threads
  for each row execute function public.set_row_updated_at();

create table if not exists public.learning_discussion_replies (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null
    references public.learning_discussion_threads (id) on delete cascade,
  space_id uuid not null references public.learning_spaces (id) on delete restrict,
  course_id uuid not null references public.learning_courses (id) on delete restrict,
  author_id uuid not null references public.profiles (id) on delete restrict,
  parent_reply_id uuid
    references public.learning_discussion_replies (id) on delete set null,
  body text not null
    constraint learning_discussion_replies_body_len check (
      char_length(body) between 1 and 20000
    ),
  status text not null default 'visible'
    constraint learning_discussion_replies_status_check check (
      status in ('visible', 'removed')
    ),
  removed_at timestamptz,
  removed_by uuid references public.profiles (id) on delete set null,
  removal_reason text
    constraint learning_discussion_replies_removal_reason_len check (
      removal_reason is null or char_length(removal_reason) <= 500
    ),
  edited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists learning_discussion_replies_thread_idx
  on public.learning_discussion_replies (thread_id, created_at);

create trigger learning_discussion_replies_set_updated_at
  before update on public.learning_discussion_replies
  for each row execute function public.set_row_updated_at();

create table if not exists public.learning_qa_questions (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.learning_spaces (id) on delete restrict,
  course_id uuid not null references public.learning_courses (id) on delete restrict,
  author_id uuid not null references public.profiles (id) on delete restrict,
  asker_role text not null
    constraint learning_qa_questions_asker_role_check check (
      asker_role in ('instructor', 'learner')
    ),
  title text not null
    constraint learning_qa_questions_title_len check (
      char_length(btrim(title)) between 1 and 200
    ),
  body text not null
    constraint learning_qa_questions_body_len check (
      char_length(body) between 1 and 20000
    ),
  status text not null default 'open'
    constraint learning_qa_questions_status_check check (
      status in ('open', 'resolved', 'locked', 'archived', 'removed')
    ),
  accepted_answer_id uuid,
  accepted_at timestamptz,
  accepted_by uuid references public.profiles (id) on delete set null,
  locked_at timestamptz,
  locked_by uuid references public.profiles (id) on delete set null,
  archived_at timestamptz,
  archived_by uuid references public.profiles (id) on delete set null,
  removed_at timestamptz,
  removed_by uuid references public.profiles (id) on delete set null,
  removal_reason text
    constraint learning_qa_questions_removal_reason_len check (
      removal_reason is null or char_length(removal_reason) <= 500
    ),
  edited_at timestamptz,
  answer_count integer not null default 0
    constraint learning_qa_questions_answer_count_nonneg check (answer_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists learning_qa_questions_course_status_idx
  on public.learning_qa_questions (course_id, status, created_at desc);

create trigger learning_qa_questions_set_updated_at
  before update on public.learning_qa_questions
  for each row execute function public.set_row_updated_at();

create table if not exists public.learning_qa_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null
    references public.learning_qa_questions (id) on delete cascade,
  space_id uuid not null references public.learning_spaces (id) on delete restrict,
  course_id uuid not null references public.learning_courses (id) on delete restrict,
  author_id uuid not null references public.profiles (id) on delete restrict,
  body text not null
    constraint learning_qa_answers_body_len check (
      char_length(body) between 1 and 20000
    ),
  status text not null default 'visible'
    constraint learning_qa_answers_status_check check (
      status in ('visible', 'removed')
    ),
  removed_at timestamptz,
  removed_by uuid references public.profiles (id) on delete set null,
  removal_reason text
    constraint learning_qa_answers_removal_reason_len check (
      removal_reason is null or char_length(removal_reason) <= 500
    ),
  edited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists learning_qa_answers_question_idx
  on public.learning_qa_answers (question_id, created_at);

create trigger learning_qa_answers_set_updated_at
  before update on public.learning_qa_answers
  for each row execute function public.set_row_updated_at();

alter table public.learning_qa_questions
  drop constraint if exists learning_qa_questions_accepted_answer_fkey;
alter table public.learning_qa_questions
  add constraint learning_qa_questions_accepted_answer_fkey
  foreign key (accepted_answer_id)
  references public.learning_qa_answers (id)
  on delete set null;

create table if not exists public.learning_announcements (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.learning_spaces (id) on delete restrict,
  course_id uuid not null references public.learning_courses (id) on delete restrict,
  author_id uuid not null references public.profiles (id) on delete restrict,
  title text not null
    constraint learning_announcements_title_len check (
      char_length(btrim(title)) between 1 and 200
    ),
  body text not null
    constraint learning_announcements_body_len check (
      char_length(body) between 1 and 20000
    ),
  status text not null default 'published'
    constraint learning_announcements_status_check check (
      status in ('published', 'archived', 'removed')
    ),
  pinned boolean not null default false,
  pinned_at timestamptz,
  pinned_by uuid references public.profiles (id) on delete set null,
  published_at timestamptz not null default now(),
  archived_at timestamptz,
  archived_by uuid references public.profiles (id) on delete set null,
  removed_at timestamptz,
  removed_by uuid references public.profiles (id) on delete set null,
  removal_reason text
    constraint learning_announcements_removal_reason_len check (
      removal_reason is null or char_length(removal_reason) <= 500
    ),
  edited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists learning_announcements_course_pin_idx
  on public.learning_announcements (course_id, pinned desc, published_at desc)
  where status = 'published';

create trigger learning_announcements_set_updated_at
  before update on public.learning_announcements
  for each row execute function public.set_row_updated_at();

-- RLS: select only; mutations via SECURITY DEFINER RPCs
alter table public.learning_discussion_threads enable row level security;
alter table public.learning_discussion_threads force row level security;
alter table public.learning_discussion_replies enable row level security;
alter table public.learning_discussion_replies force row level security;
alter table public.learning_qa_questions enable row level security;
alter table public.learning_qa_questions force row level security;
alter table public.learning_qa_answers enable row level security;
alter table public.learning_qa_answers force row level security;
alter table public.learning_announcements enable row level security;
alter table public.learning_announcements force row level security;

revoke all on table public.learning_discussion_threads from public, anon, authenticated;
grant select on table public.learning_discussion_threads to authenticated;
revoke insert, update, delete on table public.learning_discussion_threads from anon, authenticated;
grant all on table public.learning_discussion_threads to service_role;

revoke all on table public.learning_discussion_replies from public, anon, authenticated;
grant select on table public.learning_discussion_replies to authenticated;
revoke insert, update, delete on table public.learning_discussion_replies from anon, authenticated;
grant all on table public.learning_discussion_replies to service_role;

revoke all on table public.learning_qa_questions from public, anon, authenticated;
grant select on table public.learning_qa_questions to authenticated;
revoke insert, update, delete on table public.learning_qa_questions from anon, authenticated;
grant all on table public.learning_qa_questions to service_role;

revoke all on table public.learning_qa_answers from public, anon, authenticated;
grant select on table public.learning_qa_answers to authenticated;
revoke insert, update, delete on table public.learning_qa_answers from anon, authenticated;
grant all on table public.learning_qa_answers to service_role;

revoke all on table public.learning_announcements from public, anon, authenticated;
grant select on table public.learning_announcements to authenticated;
revoke insert, update, delete on table public.learning_announcements from anon, authenticated;
grant all on table public.learning_announcements to service_role;

drop policy if exists "Course members read discussion threads"
  on public.learning_discussion_threads;
create policy "Course members read discussion threads"
  on public.learning_discussion_threads for select to authenticated
  using (
    status is distinct from 'removed'
    and (
      public.has_learning_course_access(course_id)
      or public.can_manage_learning_course(course_id)
      or public.is_platform_admin()
    )
  );

drop policy if exists "Staff read removed discussion threads"
  on public.learning_discussion_threads;
create policy "Staff read removed discussion threads"
  on public.learning_discussion_threads for select to authenticated
  using (
    status = 'removed'
    and (
      public.can_manage_learning_course(course_id)
      or public.is_learning_course_staff(course_id)
      or public.is_platform_admin()
    )
  );

drop policy if exists "Course members read discussion replies"
  on public.learning_discussion_replies;
create policy "Course members read discussion replies"
  on public.learning_discussion_replies for select to authenticated
  using (
    status = 'visible'
    and (
      public.has_learning_course_access(course_id)
      or public.can_manage_learning_course(course_id)
      or public.is_platform_admin()
    )
  );

drop policy if exists "Staff read removed discussion replies"
  on public.learning_discussion_replies;
create policy "Staff read removed discussion replies"
  on public.learning_discussion_replies for select to authenticated
  using (
    status = 'removed'
    and (
      public.can_manage_learning_course(course_id)
      or public.is_learning_course_staff(course_id)
      or public.is_platform_admin()
    )
  );

drop policy if exists "Course members read qa questions"
  on public.learning_qa_questions;
create policy "Course members read qa questions"
  on public.learning_qa_questions for select to authenticated
  using (
    status is distinct from 'removed'
    and (
      public.has_learning_course_access(course_id)
      or public.can_manage_learning_course(course_id)
      or public.is_platform_admin()
    )
  );

drop policy if exists "Staff read removed qa questions"
  on public.learning_qa_questions;
create policy "Staff read removed qa questions"
  on public.learning_qa_questions for select to authenticated
  using (
    status = 'removed'
    and (
      public.can_manage_learning_course(course_id)
      or public.is_learning_course_staff(course_id)
      or public.is_platform_admin()
    )
  );

drop policy if exists "Course members read qa answers"
  on public.learning_qa_answers;
create policy "Course members read qa answers"
  on public.learning_qa_answers for select to authenticated
  using (
    status = 'visible'
    and (
      public.has_learning_course_access(course_id)
      or public.can_manage_learning_course(course_id)
      or public.is_platform_admin()
    )
  );

drop policy if exists "Staff read removed qa answers"
  on public.learning_qa_answers;
create policy "Staff read removed qa answers"
  on public.learning_qa_answers for select to authenticated
  using (
    status = 'removed'
    and (
      public.can_manage_learning_course(course_id)
      or public.is_learning_course_staff(course_id)
      or public.is_platform_admin()
    )
  );

drop policy if exists "Course members read published announcements"
  on public.learning_announcements;
create policy "Course members read published announcements"
  on public.learning_announcements for select to authenticated
  using (
    status = 'published'
    and (
      public.has_learning_course_access(course_id)
      or public.can_manage_learning_course(course_id)
      or public.is_platform_admin()
    )
  );

drop policy if exists "Staff read all announcements"
  on public.learning_announcements;
create policy "Staff read all announcements"
  on public.learning_announcements for select to authenticated
  using (
    public.can_manage_learning_course(course_id)
    or public.is_learning_course_staff(course_id)
    or public.is_platform_admin()
  );

-- ---------------------------------------------------------------------------
-- 2) Helpers
-- ---------------------------------------------------------------------------

create or replace function public.learning_community_course_space_id(p_course_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.space_id
  from public.learning_courses c
  join public.learning_programs p on p.id = c.program_id
  where c.id = p_course_id;
$$;

revoke all on function public.learning_community_course_space_id(uuid)
  from public, anon, authenticated;

create or replace function public.learning_community_assert_access(
  p_course_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_course_id is null then
    raise exception 'course_id is required';
  end if;
  if not (
    public.has_learning_course_access(p_course_id, p_user_id)
    or public.can_manage_learning_course(p_course_id, p_user_id)
    or public.is_platform_admin(p_user_id)
  ) then
    raise exception 'Not entitled to this course';
  end if;
end;
$$;

revoke all on function public.learning_community_assert_access(uuid, uuid)
  from public, anon, authenticated;

create or replace function public.learning_community_assert_staff(
  p_course_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    raise exception 'Authentication required';
  end if;
  if not (
    public.can_manage_learning_course(p_course_id, p_user_id)
    or public.is_learning_course_staff(p_course_id, p_user_id)
    or public.is_platform_admin(p_user_id)
  ) then
    raise exception 'Not allowed to moderate this course community';
  end if;
end;
$$;

revoke all on function public.learning_community_assert_staff(uuid, uuid)
  from public, anon, authenticated;

create or replace function public.learning_community_author_label(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select public.learning_instructor_learner_label(p_user_id);
$$;

revoke all on function public.learning_community_author_label(uuid)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3) Discussion RPCs
-- ---------------------------------------------------------------------------

create or replace function public.create_learning_discussion_thread(
  p_course_id uuid,
  p_title text,
  p_body text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_space uuid;
  v_title text := btrim(coalesce(p_title, ''));
  v_body text := coalesce(p_body, '');
  v_row public.learning_discussion_threads%rowtype;
begin
  perform public.learning_community_assert_access(p_course_id, v_uid);
  v_space := public.learning_community_course_space_id(p_course_id);
  if v_space is null then raise exception 'Learning course not found'; end if;
  if char_length(v_title) < 1 or char_length(v_title) > 200 then
    raise exception 'Invalid title';
  end if;
  if char_length(v_body) < 1 or char_length(v_body) > 20000 then
    raise exception 'Invalid body';
  end if;

  insert into public.learning_discussion_threads (
    space_id, course_id, author_id, title, body, status
  ) values (
    v_space, p_course_id, v_uid, v_title, v_body, 'open'
  ) returning * into v_row;

  perform public.learning_audit_write(
    v_uid, v_space, 'community.discussion_create',
    'learning_discussion_thread', v_row.id::text,
    jsonb_build_object('course_id', p_course_id)
  );

  return jsonb_build_object(
    'thread_id', v_row.id,
    'course_id', v_row.course_id,
    'title', v_row.title,
    'status', v_row.status,
    'created_at', v_row.created_at
  );
end;
$$;

create or replace function public.reply_to_learning_discussion(
  p_thread_id uuid,
  p_body text,
  p_parent_reply_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_thread public.learning_discussion_threads%rowtype;
  v_body text := coalesce(p_body, '');
  v_row public.learning_discussion_replies%rowtype;
begin
  select * into v_thread from public.learning_discussion_threads
  where id = p_thread_id for update;
  if not found then raise exception 'Discussion thread not found'; end if;
  perform public.learning_community_assert_access(v_thread.course_id, v_uid);
  if v_thread.status is distinct from 'open' then
    raise exception 'Discussion thread is not open';
  end if;
  if char_length(v_body) < 1 or char_length(v_body) > 20000 then
    raise exception 'Invalid body';
  end if;
  if p_parent_reply_id is not null and not exists (
    select 1 from public.learning_discussion_replies r
    where r.id = p_parent_reply_id and r.thread_id = p_thread_id and r.status = 'visible'
  ) then
    raise exception 'Parent reply not found';
  end if;

  insert into public.learning_discussion_replies (
    thread_id, space_id, course_id, author_id, parent_reply_id, body, status
  ) values (
    p_thread_id, v_thread.space_id, v_thread.course_id, v_uid, p_parent_reply_id, v_body, 'visible'
  ) returning * into v_row;

  update public.learning_discussion_threads
  set reply_count = reply_count + 1,
      last_reply_at = now(),
      updated_at = now()
  where id = p_thread_id;

  if v_thread.author_id is distinct from v_uid then
    perform public.create_notification(
      v_thread.author_id,
      v_uid,
      'learning_discussion_reply',
      'New discussion reply',
      'Someone replied to your discussion.',
      'learning_discussion_thread',
      p_thread_id::text,
      '/learning/courses/' || v_thread.course_id::text || '/community/discussions/' || p_thread_id::text,
      jsonb_build_object('thread_id', p_thread_id, 'reply_id', v_row.id),
      'learning_discussion_reply:' || v_row.id::text
    );
  end if;

  return jsonb_build_object(
    'reply_id', v_row.id,
    'thread_id', p_thread_id,
    'created_at', v_row.created_at
  );
end;
$$;

create or replace function public.edit_learning_discussion_thread(
  p_thread_id uuid,
  p_title text,
  p_body text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.learning_discussion_threads%rowtype;
  v_title text := btrim(coalesce(p_title, ''));
  v_body text := coalesce(p_body, '');
begin
  select * into v_row from public.learning_discussion_threads
  where id = p_thread_id for update;
  if not found then raise exception 'Discussion thread not found'; end if;
  if v_row.author_id is distinct from v_uid then
    raise exception 'Not allowed to edit this discussion';
  end if;
  if v_row.status is distinct from 'open' then
    raise exception 'Discussion thread is not editable';
  end if;
  if char_length(v_title) < 1 or char_length(v_body) < 1 then
    raise exception 'Invalid title or body';
  end if;

  update public.learning_discussion_threads
  set title = v_title, body = v_body, edited_at = now(), updated_at = now()
  where id = p_thread_id
  returning * into v_row;

  return jsonb_build_object(
    'thread_id', v_row.id,
    'title', v_row.title,
    'edited_at', v_row.edited_at
  );
end;
$$;

create or replace function public.edit_learning_discussion_reply(
  p_reply_id uuid,
  p_body text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.learning_discussion_replies%rowtype;
  v_thread public.learning_discussion_threads%rowtype;
  v_body text := coalesce(p_body, '');
begin
  select * into v_row from public.learning_discussion_replies
  where id = p_reply_id for update;
  if not found then raise exception 'Reply not found'; end if;
  if v_row.author_id is distinct from v_uid then
    raise exception 'Not allowed to edit this reply';
  end if;
  if v_row.status is distinct from 'visible' then
    raise exception 'Reply is not editable';
  end if;
  select * into v_thread from public.learning_discussion_threads where id = v_row.thread_id;
  if v_thread.status is distinct from 'open' then
    raise exception 'Discussion thread is not open';
  end if;
  if char_length(v_body) < 1 then raise exception 'Invalid body'; end if;

  update public.learning_discussion_replies
  set body = v_body, edited_at = now(), updated_at = now()
  where id = p_reply_id
  returning * into v_row;

  return jsonb_build_object('reply_id', v_row.id, 'edited_at', v_row.edited_at);
end;
$$;

create or replace function public.soft_delete_learning_discussion_thread(
  p_thread_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.learning_discussion_threads%rowtype;
begin
  select * into v_row from public.learning_discussion_threads
  where id = p_thread_id for update;
  if not found then raise exception 'Discussion thread not found'; end if;
  if v_row.author_id is distinct from v_uid then
    perform public.learning_community_assert_staff(v_row.course_id, v_uid);
  end if;

  update public.learning_discussion_threads
  set status = 'removed',
      removed_at = now(),
      removed_by = v_uid,
      removal_reason = nullif(btrim(coalesce(p_reason, '')), ''),
      updated_at = now()
  where id = p_thread_id
  returning * into v_row;

  perform public.learning_audit_write(
    v_uid, v_row.space_id, 'community.discussion_remove',
    'learning_discussion_thread', p_thread_id::text,
    jsonb_build_object('course_id', v_row.course_id)
  );

  return jsonb_build_object('thread_id', p_thread_id, 'status', 'removed');
end;
$$;

create or replace function public.lock_learning_discussion_thread(
  p_thread_id uuid,
  p_locked boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.learning_discussion_threads%rowtype;
begin
  select * into v_row from public.learning_discussion_threads
  where id = p_thread_id for update;
  if not found then raise exception 'Discussion thread not found'; end if;
  perform public.learning_community_assert_staff(v_row.course_id, v_uid);
  if v_row.status = 'removed' then raise exception 'Discussion thread is removed'; end if;

  if p_locked then
    update public.learning_discussion_threads
    set status = 'locked', locked_at = now(), locked_by = v_uid, updated_at = now()
    where id = p_thread_id returning * into v_row;
  else
    update public.learning_discussion_threads
    set status = 'open', locked_at = null, locked_by = null, updated_at = now()
    where id = p_thread_id returning * into v_row;
  end if;

  return jsonb_build_object('thread_id', p_thread_id, 'status', v_row.status);
end;
$$;

create or replace function public.archive_learning_discussion_thread(
  p_thread_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.learning_discussion_threads%rowtype;
begin
  select * into v_row from public.learning_discussion_threads
  where id = p_thread_id for update;
  if not found then raise exception 'Discussion thread not found'; end if;
  perform public.learning_community_assert_staff(v_row.course_id, v_uid);

  update public.learning_discussion_threads
  set status = 'archived', archived_at = now(), archived_by = v_uid, updated_at = now()
  where id = p_thread_id
  returning * into v_row;

  return jsonb_build_object('thread_id', p_thread_id, 'status', 'archived');
end;
$$;

create or replace function public.list_learning_discussion_threads(
  p_course_id uuid,
  p_limit integer default 50
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
  v_items jsonb;
begin
  perform public.learning_community_assert_access(p_course_id, v_uid);

  select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  into v_items
  from (
    select
      d.id as thread_id,
      d.title,
      left(d.body, 280) as preview,
      d.status,
      d.reply_count,
      d.last_reply_at,
      d.created_at,
      d.author_id,
      public.learning_community_author_label(d.author_id) as author_label
    from public.learning_discussion_threads d
    where d.course_id = p_course_id
      and d.status in ('open', 'locked', 'archived')
    order by coalesce(d.last_reply_at, d.created_at) desc
    limit v_limit
  ) t;

  return jsonb_build_object(
    'course_id', p_course_id,
    'threads', v_items,
    'thread_count', jsonb_array_length(v_items)
  );
end;
$$;

create or replace function public.get_learning_discussion_thread(
  p_thread_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.learning_discussion_threads%rowtype;
  v_replies jsonb;
begin
  select * into v_row from public.learning_discussion_threads where id = p_thread_id;
  if not found then raise exception 'Discussion thread not found'; end if;
  perform public.learning_community_assert_access(v_row.course_id, v_uid);
  if v_row.status = 'removed'
     and not (
       public.can_manage_learning_course(v_row.course_id, v_uid)
       or public.is_learning_course_staff(v_row.course_id, v_uid)
       or public.is_platform_admin(v_uid)
     )
  then
    raise exception 'Discussion thread not found';
  end if;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  into v_replies
  from (
    select
      r.id as reply_id,
      r.body,
      r.parent_reply_id,
      r.status,
      r.edited_at,
      r.created_at,
      r.author_id,
      public.learning_community_author_label(r.author_id) as author_label
    from public.learning_discussion_replies r
    where r.thread_id = p_thread_id
      and (
        r.status = 'visible'
        or public.can_manage_learning_course(v_row.course_id, v_uid)
        or public.is_learning_course_staff(v_row.course_id, v_uid)
        or public.is_platform_admin(v_uid)
      )
    order by r.created_at
  ) t;

  return jsonb_build_object(
    'thread_id', v_row.id,
    'course_id', v_row.course_id,
    'title', v_row.title,
    'body', v_row.body,
    'status', v_row.status,
    'reply_count', v_row.reply_count,
    'edited_at', v_row.edited_at,
    'created_at', v_row.created_at,
    'author_id', v_row.author_id,
    'author_label', public.learning_community_author_label(v_row.author_id),
    'replies', v_replies
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 4) Q&A RPCs
-- ---------------------------------------------------------------------------

create or replace function public.create_learning_qa_question(
  p_course_id uuid,
  p_title text,
  p_body text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_space uuid;
  v_title text := btrim(coalesce(p_title, ''));
  v_body text := coalesce(p_body, '');
  v_role text;
  v_row public.learning_qa_questions%rowtype;
begin
  perform public.learning_community_assert_access(p_course_id, v_uid);
  v_space := public.learning_community_course_space_id(p_course_id);
  if v_space is null then raise exception 'Learning course not found'; end if;
  if char_length(v_title) < 1 or char_length(v_body) < 1 then
    raise exception 'Invalid title or body';
  end if;

  v_role := case
    when public.is_learning_course_staff(p_course_id, v_uid)
      or public.can_manage_learning_course(p_course_id, v_uid)
      or public.is_platform_admin(v_uid)
    then 'instructor'
    else 'learner'
  end;

  insert into public.learning_qa_questions (
    space_id, course_id, author_id, asker_role, title, body, status
  ) values (
    v_space, p_course_id, v_uid, v_role, v_title, v_body, 'open'
  ) returning * into v_row;

  return jsonb_build_object(
    'question_id', v_row.id,
    'asker_role', v_row.asker_role,
    'status', v_row.status,
    'created_at', v_row.created_at
  );
end;
$$;

create or replace function public.answer_learning_qa_question(
  p_question_id uuid,
  p_body text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_q public.learning_qa_questions%rowtype;
  v_body text := coalesce(p_body, '');
  v_row public.learning_qa_answers%rowtype;
begin
  select * into v_q from public.learning_qa_questions
  where id = p_question_id for update;
  if not found then raise exception 'Question not found'; end if;
  perform public.learning_community_assert_access(v_q.course_id, v_uid);
  if v_q.status not in ('open', 'resolved') then
    raise exception 'Question is not open for answers';
  end if;
  if char_length(v_body) < 1 then raise exception 'Invalid body'; end if;

  insert into public.learning_qa_answers (
    question_id, space_id, course_id, author_id, body, status
  ) values (
    p_question_id, v_q.space_id, v_q.course_id, v_uid, v_body, 'visible'
  ) returning * into v_row;

  update public.learning_qa_questions
  set answer_count = answer_count + 1, updated_at = now()
  where id = p_question_id;

  if v_q.author_id is distinct from v_uid then
    perform public.create_notification(
      v_q.author_id,
      v_uid,
      'learning_qa_answered',
      'New answer on your question',
      'Someone answered your course question.',
      'learning_qa_question',
      p_question_id::text,
      '/learning/courses/' || v_q.course_id::text || '/community/qa/' || p_question_id::text,
      jsonb_build_object('question_id', p_question_id, 'answer_id', v_row.id),
      'learning_qa_answered:' || v_row.id::text
    );
  end if;

  return jsonb_build_object(
    'answer_id', v_row.id,
    'question_id', p_question_id,
    'created_at', v_row.created_at
  );
end;
$$;

create or replace function public.accept_learning_qa_answer(
  p_answer_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ans public.learning_qa_answers%rowtype;
  v_q public.learning_qa_questions%rowtype;
begin
  select * into v_ans from public.learning_qa_answers where id = p_answer_id;
  if not found then raise exception 'Answer not found'; end if;
  if v_ans.status is distinct from 'visible' then
    raise exception 'Answer is not visible';
  end if;

  select * into v_q from public.learning_qa_questions
  where id = v_ans.question_id for update;
  if not found then raise exception 'Question not found'; end if;

  if v_q.author_id is distinct from v_uid then
    perform public.learning_community_assert_staff(v_q.course_id, v_uid);
  else
    perform public.learning_community_assert_access(v_q.course_id, v_uid);
  end if;

  update public.learning_qa_questions
  set status = 'resolved',
      accepted_answer_id = p_answer_id,
      accepted_at = now(),
      accepted_by = v_uid,
      updated_at = now()
  where id = v_q.id;

  return jsonb_build_object(
    'question_id', v_q.id,
    'accepted_answer_id', p_answer_id,
    'status', 'resolved'
  );
end;
$$;

create or replace function public.list_learning_qa_questions(
  p_course_id uuid,
  p_status text default null,
  p_limit integer default 50
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_status text := lower(nullif(btrim(coalesce(p_status, '')), ''));
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
  v_items jsonb;
begin
  perform public.learning_community_assert_access(p_course_id, v_uid);
  if v_status is not null and v_status not in ('open', 'resolved', 'locked', 'archived') then
    raise exception 'Invalid status filter';
  end if;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  into v_items
  from (
    select
      q.id as question_id,
      q.title,
      left(q.body, 280) as preview,
      q.asker_role,
      q.status,
      q.answer_count,
      q.accepted_answer_id,
      q.created_at,
      q.author_id,
      public.learning_community_author_label(q.author_id) as author_label
    from public.learning_qa_questions q
    where q.course_id = p_course_id
      and q.status is distinct from 'removed'
      and (v_status is null or q.status = v_status)
    order by
      case when q.status = 'open' then 0 else 1 end,
      q.created_at desc
    limit v_limit
  ) t;

  return jsonb_build_object(
    'course_id', p_course_id,
    'questions', v_items,
    'question_count', jsonb_array_length(v_items)
  );
end;
$$;

create or replace function public.get_learning_qa_question(
  p_question_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_q public.learning_qa_questions%rowtype;
  v_answers jsonb;
begin
  select * into v_q from public.learning_qa_questions where id = p_question_id;
  if not found then raise exception 'Question not found'; end if;
  perform public.learning_community_assert_access(v_q.course_id, v_uid);

  select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  into v_answers
  from (
    select
      a.id as answer_id,
      a.body,
      a.status,
      a.edited_at,
      a.created_at,
      a.author_id,
      public.learning_community_author_label(a.author_id) as author_label,
      (v_q.accepted_answer_id is not null and v_q.accepted_answer_id = a.id) as is_accepted
    from public.learning_qa_answers a
    where a.question_id = p_question_id
      and a.status = 'visible'
    order by
      case when v_q.accepted_answer_id = a.id then 0 else 1 end,
      a.created_at
  ) t;

  return jsonb_build_object(
    'question_id', v_q.id,
    'course_id', v_q.course_id,
    'title', v_q.title,
    'body', v_q.body,
    'asker_role', v_q.asker_role,
    'status', v_q.status,
    'accepted_answer_id', v_q.accepted_answer_id,
    'accepted_at', v_q.accepted_at,
    'author_id', v_q.author_id,
    'author_label', public.learning_community_author_label(v_q.author_id),
    'created_at', v_q.created_at,
    'answers', v_answers
  );
end;
$$;

create or replace function public.moderate_learning_qa_question(
  p_question_id uuid,
  p_action text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_q public.learning_qa_questions%rowtype;
  v_action text := lower(btrim(coalesce(p_action, '')));
begin
  select * into v_q from public.learning_qa_questions
  where id = p_question_id for update;
  if not found then raise exception 'Question not found'; end if;
  perform public.learning_community_assert_staff(v_q.course_id, v_uid);

  if v_action = 'lock' then
    update public.learning_qa_questions
    set status = 'locked', locked_at = now(), locked_by = v_uid, updated_at = now()
    where id = p_question_id;
  elsif v_action = 'archive' then
    update public.learning_qa_questions
    set status = 'archived', archived_at = now(), archived_by = v_uid, updated_at = now()
    where id = p_question_id;
  elsif v_action = 'remove' then
    update public.learning_qa_questions
    set status = 'removed',
        removed_at = now(),
        removed_by = v_uid,
        removal_reason = nullif(btrim(coalesce(p_reason, '')), ''),
        updated_at = now()
    where id = p_question_id;
  elsif v_action = 'reopen' then
    update public.learning_qa_questions
    set status = case when accepted_answer_id is null then 'open' else 'resolved' end,
        locked_at = null, locked_by = null, updated_at = now()
    where id = p_question_id;
  else
    raise exception 'Invalid moderation action';
  end if;

  select status into v_action from public.learning_qa_questions where id = p_question_id;
  return jsonb_build_object('question_id', p_question_id, 'status', v_action);
end;
$$;

-- ---------------------------------------------------------------------------
-- 5) Announcements
-- ---------------------------------------------------------------------------

create or replace function public.publish_learning_announcement(
  p_course_id uuid,
  p_title text,
  p_body text,
  p_pinned boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_space uuid;
  v_title text := btrim(coalesce(p_title, ''));
  v_body text := coalesce(p_body, '');
  v_row public.learning_announcements%rowtype;
  v_learner record;
begin
  perform public.learning_community_assert_staff(p_course_id, v_uid);
  v_space := public.learning_community_course_space_id(p_course_id);
  if v_space is null then raise exception 'Learning course not found'; end if;
  if char_length(v_title) < 1 or char_length(v_body) < 1 then
    raise exception 'Invalid title or body';
  end if;

  insert into public.learning_announcements (
    space_id, course_id, author_id, title, body, status,
    pinned, pinned_at, pinned_by, published_at
  ) values (
    v_space, p_course_id, v_uid, v_title, v_body, 'published',
    coalesce(p_pinned, false),
    case when coalesce(p_pinned, false) then now() else null end,
    case when coalesce(p_pinned, false) then v_uid else null end,
    now()
  ) returning * into v_row;

  -- Notify active course learners (in-platform only; capped)
  for v_learner in
    select l.learner_user_id
    from public.learning_instructor_course_learners(p_course_id) l
    where l.enrollment_status = 'active'
      and l.learner_user_id is distinct from v_uid
    limit 200
  loop
    perform public.create_notification(
      v_learner.learner_user_id,
      v_uid,
      'learning_announcement_posted',
      'Course announcement',
      v_title,
      'learning_announcement',
      v_row.id::text,
      '/learning/courses/' || p_course_id::text || '/community',
      jsonb_build_object('announcement_id', v_row.id, 'course_id', p_course_id),
      'learning_announcement_posted:' || v_row.id::text || ':' || v_learner.learner_user_id::text
    );
  end loop;

  perform public.learning_audit_write(
    v_uid, v_space, 'community.announcement_publish',
    'learning_announcement', v_row.id::text,
    jsonb_build_object('course_id', p_course_id, 'pinned', v_row.pinned)
  );

  return jsonb_build_object(
    'announcement_id', v_row.id,
    'status', v_row.status,
    'pinned', v_row.pinned,
    'published_at', v_row.published_at
  );
end;
$$;

create or replace function public.pin_learning_announcement(
  p_announcement_id uuid,
  p_pinned boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.learning_announcements%rowtype;
begin
  select * into v_row from public.learning_announcements
  where id = p_announcement_id for update;
  if not found then raise exception 'Announcement not found'; end if;
  perform public.learning_community_assert_staff(v_row.course_id, v_uid);
  if v_row.status is distinct from 'published' then
    raise exception 'Only published announcements can be pinned';
  end if;

  update public.learning_announcements
  set pinned = coalesce(p_pinned, true),
      pinned_at = case when coalesce(p_pinned, true) then now() else null end,
      pinned_by = case when coalesce(p_pinned, true) then v_uid else null end,
      updated_at = now()
  where id = p_announcement_id
  returning * into v_row;

  return jsonb_build_object(
    'announcement_id', v_row.id,
    'pinned', v_row.pinned
  );
end;
$$;

create or replace function public.archive_learning_announcement(
  p_announcement_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.learning_announcements%rowtype;
begin
  select * into v_row from public.learning_announcements
  where id = p_announcement_id for update;
  if not found then raise exception 'Announcement not found'; end if;
  perform public.learning_community_assert_staff(v_row.course_id, v_uid);

  update public.learning_announcements
  set status = 'archived',
      archived_at = now(),
      archived_by = v_uid,
      pinned = false,
      pinned_at = null,
      pinned_by = null,
      updated_at = now()
  where id = p_announcement_id
  returning * into v_row;

  return jsonb_build_object('announcement_id', v_row.id, 'status', 'archived');
end;
$$;

create or replace function public.remove_learning_announcement(
  p_announcement_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.learning_announcements%rowtype;
begin
  select * into v_row from public.learning_announcements
  where id = p_announcement_id for update;
  if not found then raise exception 'Announcement not found'; end if;
  perform public.learning_community_assert_staff(v_row.course_id, v_uid);

  update public.learning_announcements
  set status = 'removed',
      removed_at = now(),
      removed_by = v_uid,
      removal_reason = nullif(btrim(coalesce(p_reason, '')), ''),
      pinned = false,
      updated_at = now()
  where id = p_announcement_id
  returning * into v_row;

  return jsonb_build_object('announcement_id', v_row.id, 'status', 'removed');
end;
$$;

create or replace function public.list_learning_announcements(
  p_course_id uuid,
  p_limit integer default 50
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
  v_staff boolean;
  v_items jsonb;
begin
  perform public.learning_community_assert_access(p_course_id, v_uid);
  v_staff := public.can_manage_learning_course(p_course_id, v_uid)
    or public.is_learning_course_staff(p_course_id, v_uid)
    or public.is_platform_admin(v_uid);

  select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  into v_items
  from (
    select
      a.id as announcement_id,
      a.title,
      left(a.body, 280) as preview,
      a.body,
      a.status,
      a.pinned,
      a.published_at,
      a.author_id,
      public.learning_community_author_label(a.author_id) as author_label
    from public.learning_announcements a
    where a.course_id = p_course_id
      and (
        a.status = 'published'
        or (v_staff and a.status in ('published', 'archived'))
      )
    order by a.pinned desc, a.published_at desc
    limit v_limit
  ) t;

  return jsonb_build_object(
    'course_id', p_course_id,
    'announcements', v_items,
    'announcement_count', jsonb_array_length(v_items)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 6) Community feed
-- ---------------------------------------------------------------------------

create or replace function public.get_learning_course_community_feed(
  p_course_id uuid,
  p_limit integer default 40
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_limit integer := least(greatest(coalesce(p_limit, 40), 1), 80);
  v_items jsonb;
  v_unanswered integer := 0;
begin
  perform public.learning_community_assert_access(p_course_id, v_uid);

  select count(*)::integer into v_unanswered
  from public.learning_qa_questions q
  where q.course_id = p_course_id and q.status = 'open';

  select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  into v_items
  from (
    (
      select
        'announcement'::text as kind,
        a.id,
        a.title,
        left(a.body, 200) as preview,
        a.pinned,
        a.published_at as occurred_at,
        a.author_id,
        public.learning_community_author_label(a.author_id) as author_label,
        a.status as item_status
      from public.learning_announcements a
      where a.course_id = p_course_id and a.status = 'published'
      order by a.pinned desc, a.published_at desc
      limit 20
    )
    union all
    (
      select
        'discussion'::text,
        d.id,
        d.title,
        left(d.body, 200),
        false,
        coalesce(d.last_reply_at, d.created_at),
        d.author_id,
        public.learning_community_author_label(d.author_id),
        d.status
      from public.learning_discussion_threads d
      where d.course_id = p_course_id and d.status in ('open', 'locked')
      order by coalesce(d.last_reply_at, d.created_at) desc
      limit 20
    )
    union all
    (
      select
        'unanswered_question'::text,
        q.id,
        q.title,
        left(q.body, 200),
        false,
        q.created_at,
        q.author_id,
        public.learning_community_author_label(q.author_id),
        q.status
      from public.learning_qa_questions q
      where q.course_id = p_course_id and q.status = 'open'
      order by q.created_at desc
      limit 20
    )
    union all
    (
      select
        'instructor_activity'::text,
        x.id,
        x.title,
        x.preview,
        x.pinned,
        x.occurred_at,
        x.author_id,
        x.author_label,
        x.item_status
      from (
        select
          a.id,
          a.title,
          left(a.body, 200) as preview,
          a.pinned,
          a.published_at as occurred_at,
          a.author_id,
          public.learning_community_author_label(a.author_id) as author_label,
          a.status as item_status
        from public.learning_announcements a
        where a.course_id = p_course_id and a.status = 'published'
        union all
        select
          q.id,
          q.title,
          left(q.body, 200),
          false,
          q.created_at,
          q.author_id,
          public.learning_community_author_label(q.author_id),
          q.status
        from public.learning_qa_questions q
        where q.course_id = p_course_id
          and q.asker_role = 'instructor'
          and q.status in ('open', 'resolved')
      ) x
      order by x.occurred_at desc
      limit 20
    )
  ) t
  order by
    case when t.kind = 'announcement' and t.pinned then 0 else 1 end,
    t.occurred_at desc
  limit v_limit;

  return jsonb_build_object(
    'course_id', p_course_id,
    'unanswered_question_count', v_unanswered,
    'items', coalesce(v_items, '[]'::jsonb),
    'item_count', jsonb_array_length(coalesce(v_items, '[]'::jsonb))
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 7) Grants
-- ---------------------------------------------------------------------------

revoke all on function public.create_learning_discussion_thread(uuid, text, text) from public, anon;
grant execute on function public.create_learning_discussion_thread(uuid, text, text) to authenticated, service_role;

revoke all on function public.reply_to_learning_discussion(uuid, text, uuid) from public, anon;
grant execute on function public.reply_to_learning_discussion(uuid, text, uuid) to authenticated, service_role;

revoke all on function public.edit_learning_discussion_thread(uuid, text, text) from public, anon;
grant execute on function public.edit_learning_discussion_thread(uuid, text, text) to authenticated, service_role;

revoke all on function public.edit_learning_discussion_reply(uuid, text) from public, anon;
grant execute on function public.edit_learning_discussion_reply(uuid, text) to authenticated, service_role;

revoke all on function public.soft_delete_learning_discussion_thread(uuid, text) from public, anon;
grant execute on function public.soft_delete_learning_discussion_thread(uuid, text) to authenticated, service_role;

revoke all on function public.lock_learning_discussion_thread(uuid, boolean) from public, anon;
grant execute on function public.lock_learning_discussion_thread(uuid, boolean) to authenticated, service_role;

revoke all on function public.archive_learning_discussion_thread(uuid) from public, anon;
grant execute on function public.archive_learning_discussion_thread(uuid) to authenticated, service_role;

revoke all on function public.list_learning_discussion_threads(uuid, integer) from public, anon;
grant execute on function public.list_learning_discussion_threads(uuid, integer) to authenticated, service_role;

revoke all on function public.get_learning_discussion_thread(uuid) from public, anon;
grant execute on function public.get_learning_discussion_thread(uuid) to authenticated, service_role;

revoke all on function public.create_learning_qa_question(uuid, text, text) from public, anon;
grant execute on function public.create_learning_qa_question(uuid, text, text) to authenticated, service_role;

revoke all on function public.answer_learning_qa_question(uuid, text) from public, anon;
grant execute on function public.answer_learning_qa_question(uuid, text) to authenticated, service_role;

revoke all on function public.accept_learning_qa_answer(uuid) from public, anon;
grant execute on function public.accept_learning_qa_answer(uuid) to authenticated, service_role;

revoke all on function public.list_learning_qa_questions(uuid, text, integer) from public, anon;
grant execute on function public.list_learning_qa_questions(uuid, text, integer) to authenticated, service_role;

revoke all on function public.get_learning_qa_question(uuid) from public, anon;
grant execute on function public.get_learning_qa_question(uuid) to authenticated, service_role;

revoke all on function public.moderate_learning_qa_question(uuid, text, text) from public, anon;
grant execute on function public.moderate_learning_qa_question(uuid, text, text) to authenticated, service_role;

revoke all on function public.publish_learning_announcement(uuid, text, text, boolean) from public, anon;
grant execute on function public.publish_learning_announcement(uuid, text, text, boolean) to authenticated, service_role;

revoke all on function public.pin_learning_announcement(uuid, boolean) from public, anon;
grant execute on function public.pin_learning_announcement(uuid, boolean) to authenticated, service_role;

revoke all on function public.archive_learning_announcement(uuid) from public, anon;
grant execute on function public.archive_learning_announcement(uuid) to authenticated, service_role;

revoke all on function public.remove_learning_announcement(uuid, text) from public, anon;
grant execute on function public.remove_learning_announcement(uuid, text) to authenticated, service_role;

revoke all on function public.list_learning_announcements(uuid, integer) from public, anon;
grant execute on function public.list_learning_announcements(uuid, integer) to authenticated, service_role;

revoke all on function public.get_learning_course_community_feed(uuid, integer) from public, anon;
grant execute on function public.get_learning_course_community_feed(uuid, integer) to authenticated, service_role;


-- ---------------------------------------------------------------------------
-- 8) Soft-delete discussion reply (author or staff)
-- ---------------------------------------------------------------------------

create or replace function public.soft_delete_learning_discussion_reply(
  p_reply_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.learning_discussion_replies%rowtype;
  v_thread public.learning_discussion_threads%rowtype;
begin
  select * into v_row from public.learning_discussion_replies
  where id = p_reply_id for update;
  if not found then raise exception 'Reply not found'; end if;

  select * into v_thread from public.learning_discussion_threads
  where id = v_row.thread_id;
  if not found then raise exception 'Discussion thread not found'; end if;

  if v_row.author_id is distinct from v_uid then
    perform public.learning_community_assert_staff(v_row.course_id, v_uid);
  else
    perform public.learning_community_assert_access(v_row.course_id, v_uid);
  end if;

  if v_row.status = 'removed' then
    return jsonb_build_object('reply_id', p_reply_id, 'status', 'removed');
  end if;

  update public.learning_discussion_replies
  set status = 'removed',
      removed_at = now(),
      removed_by = v_uid,
      removal_reason = nullif(btrim(coalesce(p_reason, '')), ''),
      updated_at = now()
  where id = p_reply_id
  returning * into v_row;

  update public.learning_discussion_threads
  set reply_count = greatest(reply_count - 1, 0),
      updated_at = now()
  where id = v_row.thread_id
    and reply_count > 0;

  perform public.learning_audit_write(
    v_uid, v_row.space_id, 'community.discussion_reply_remove',
    'learning_discussion_reply', p_reply_id::text,
    jsonb_build_object('course_id', v_row.course_id, 'thread_id', v_row.thread_id)
  );

  return jsonb_build_object('reply_id', p_reply_id, 'status', 'removed');
end;
$$;

revoke all on function public.soft_delete_learning_discussion_reply(uuid, text) from public, anon;
grant execute on function public.soft_delete_learning_discussion_reply(uuid, text) to authenticated, service_role;
