-- LOCAL CANDIDATE ONLY — do not apply to production.
-- Learning Hub 1-to-1 booking foundation. Payment fields are intentionally absent.

create table public.learning_one_to_one_availability (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learning_one_to_one_availability_time_check
    check (ends_at > starts_at),
  constraint learning_one_to_one_availability_status_check
    check (status in ('open', 'blocked')),
  constraint learning_one_to_one_availability_unique_window
    unique (teacher_id, starts_at, ends_at)
);

create table public.learning_one_to_one_bookings (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  learner_id uuid not null references auth.users(id) on delete cascade,
  availability_id uuid not null
    references public.learning_one_to_one_availability(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'requested',
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learning_one_to_one_booking_time_check
    check (ends_at > starts_at),
  constraint learning_one_to_one_booking_people_check
    check (teacher_id <> learner_id),
  constraint learning_one_to_one_booking_status_check
    check (status in ('requested', 'confirmed', 'cancelled', 'completed'))
);

create unique index learning_one_to_one_one_active_booking_per_availability
  on public.learning_one_to_one_bookings (availability_id)
  where status in ('requested', 'confirmed');

alter table public.learning_one_to_one_availability enable row level security;
alter table public.learning_one_to_one_bookings enable row level security;
alter table public.learning_one_to_one_availability force row level security;
alter table public.learning_one_to_one_bookings force row level security;

revoke all on table public.learning_one_to_one_availability from anon, authenticated;
revoke all on table public.learning_one_to_one_bookings from anon, authenticated;

grant select
  on table public.learning_one_to_one_availability to authenticated;
grant select, insert
  on table public.learning_one_to_one_bookings to authenticated;

create policy "Authenticated users read open one-to-one availability"
on public.learning_one_to_one_availability
for select
to authenticated
using (
  status = 'open'
  or teacher_id = (select auth.uid())
);

create policy "Teachers insert own one-to-one availability"
on public.learning_one_to_one_availability
for insert
to authenticated
with check (
  teacher_id = (select auth.uid())
);

create policy "Teachers update own one-to-one availability"
on public.learning_one_to_one_availability
for update
to authenticated
using (
  teacher_id = (select auth.uid())
)
with check (
  teacher_id = (select auth.uid())
);

create policy "Teachers delete own one-to-one availability"
on public.learning_one_to_one_availability
for delete
to authenticated
using (
  teacher_id = (select auth.uid())
);

create policy "Booking parties read own one-to-one bookings"
on public.learning_one_to_one_bookings
for select
to authenticated
using (
  learner_id = (select auth.uid())
  or teacher_id = (select auth.uid())
);

create policy "Learners request own one-to-one bookings"
on public.learning_one_to_one_bookings
for insert
to authenticated
with check (
  learner_id = (select auth.uid())
  and teacher_id <> (select auth.uid())
  and exists (
    select 1
    from public.learning_one_to_one_availability a
    where a.id = availability_id
      and a.teacher_id = learning_one_to_one_bookings.teacher_id
      and a.starts_at = learning_one_to_one_bookings.starts_at
      and a.ends_at = learning_one_to_one_bookings.ends_at
      and a.status = 'open'
  )
);

create or replace function public.list_learning_one_to_one_availability(
  p_teacher_id uuid,
  p_from timestamptz default null,
  p_to timestamptz default null
)
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
  if p_teacher_id is null then
    raise exception 'Teacher is required';
  end if;

  return coalesce(
    (
      select jsonb_agg(jsonb_build_object(
        'id', a.id,
        'teacher_id', a.teacher_id,
        'starts_at', a.starts_at,
        'ends_at', a.ends_at,
        'status', a.status
      ) order by a.starts_at)
      from public.learning_one_to_one_availability a
      where a.teacher_id = p_teacher_id
        and (p_from is null or a.ends_at >= p_from)
        and (p_to is null or a.starts_at <= p_to)
        and (a.status = 'open' or a.teacher_id = v_uid)
    ),
    '[]'::jsonb
  );
end;
$$;

create or replace function public.list_my_learning_one_to_one_bookings()
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
      select jsonb_agg(jsonb_build_object(
        'id', b.id,
        'teacher_id', b.teacher_id,
        'learner_id', b.learner_id,
        'availability_id', b.availability_id,
        'starts_at', b.starts_at,
        'ends_at', b.ends_at,
        'status', b.status,
        'cancellation_reason', b.cancellation_reason
      ) order by b.starts_at)
      from public.learning_one_to_one_bookings b
      where b.learner_id = v_uid or b.teacher_id = v_uid
    ),
    '[]'::jsonb
  );
end;
$$;

create or replace function public.request_learning_one_to_one_booking(
  p_availability_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_slot public.learning_one_to_one_availability%rowtype;
  v_row public.learning_one_to_one_bookings%rowtype;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select * into v_slot
  from public.learning_one_to_one_availability
  where id = p_availability_id
  for update;

  if not found then
    raise exception 'Availability not found';
  end if;
  if v_slot.status <> 'open' then
    raise exception 'Time is not open';
  end if;
  if v_slot.teacher_id = v_uid then
    raise exception 'Teacher cannot book own availability';
  end if;

  insert into public.learning_one_to_one_bookings (
    teacher_id, learner_id, availability_id, starts_at, ends_at, status
  ) values (
    v_slot.teacher_id, v_uid, v_slot.id, v_slot.starts_at, v_slot.ends_at, 'requested'
  )
  returning * into v_row;

  return jsonb_build_object('id', v_row.id, 'status', v_row.status);
end;
$$;

create or replace function public.reschedule_learning_one_to_one_booking(
  p_booking_id uuid,
  p_availability_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_booking public.learning_one_to_one_bookings%rowtype;
  v_slot public.learning_one_to_one_availability%rowtype;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select * into v_booking
  from public.learning_one_to_one_bookings
  where id = p_booking_id
  for update;
  if not found then
    raise exception 'Booking not found';
  end if;
  if v_booking.learner_id <> v_uid and v_booking.teacher_id <> v_uid then
    raise exception 'Not allowed';
  end if;
  if v_booking.status not in ('requested', 'confirmed') then
    raise exception 'Terminal booking cannot be updated';
  end if;

  select * into v_slot
  from public.learning_one_to_one_availability
  where id = p_availability_id
  for update;
  if not found or v_slot.status <> 'open' or v_slot.teacher_id <> v_booking.teacher_id then
    raise exception 'Time is not open';
  end if;

  update public.learning_one_to_one_bookings
  set availability_id = v_slot.id,
      starts_at = v_slot.starts_at,
      ends_at = v_slot.ends_at,
      status = 'requested',
      updated_at = now()
  where id = v_booking.id
  returning * into v_booking;

  return jsonb_build_object('id', v_booking.id, 'status', v_booking.status);
end;
$$;

create or replace function public.cancel_learning_one_to_one_booking(
  p_booking_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_booking public.learning_one_to_one_bookings%rowtype;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select * into v_booking
  from public.learning_one_to_one_bookings
  where id = p_booking_id
  for update;
  if not found then
    raise exception 'Booking not found';
  end if;
  if v_booking.learner_id <> v_uid and v_booking.teacher_id <> v_uid then
    raise exception 'Not allowed';
  end if;
  if v_booking.status in ('cancelled', 'completed') then
    raise exception 'Terminal booking cannot be updated';
  end if;

  update public.learning_one_to_one_bookings
  set status = 'cancelled',
      cancellation_reason = nullif(btrim(coalesce(p_reason, '')), ''),
      updated_at = now()
  where id = v_booking.id
  returning * into v_booking;

  return jsonb_build_object('id', v_booking.id, 'status', v_booking.status);
end;
$$;

create or replace function public.confirm_learning_one_to_one_booking(
  p_booking_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_booking public.learning_one_to_one_bookings%rowtype;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select * into v_booking
  from public.learning_one_to_one_bookings
  where id = p_booking_id
  for update;
  if not found then
    raise exception 'Booking not found';
  end if;
  if v_booking.teacher_id <> v_uid then
    raise exception 'Not allowed';
  end if;
  if v_booking.status <> 'requested' then
    raise exception 'Terminal booking cannot be updated';
  end if;

  update public.learning_one_to_one_bookings
  set status = 'confirmed', updated_at = now()
  where id = v_booking.id
  returning * into v_booking;

  return jsonb_build_object('id', v_booking.id, 'status', v_booking.status);
end;
$$;

create or replace function public.complete_learning_one_to_one_booking(
  p_booking_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_booking public.learning_one_to_one_bookings%rowtype;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select * into v_booking
  from public.learning_one_to_one_bookings
  where id = p_booking_id
  for update;
  if not found then
    raise exception 'Booking not found';
  end if;
  if v_booking.teacher_id <> v_uid then
    raise exception 'Not allowed';
  end if;
  if v_booking.status <> 'confirmed' then
    raise exception 'Terminal booking cannot be updated';
  end if;

  update public.learning_one_to_one_bookings
  set status = 'completed', updated_at = now()
  where id = v_booking.id
  returning * into v_booking;

  return jsonb_build_object('id', v_booking.id, 'status', v_booking.status);
end;
$$;

create or replace function public.upsert_learning_one_to_one_availability(
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.learning_one_to_one_availability%rowtype;
  v_status text := lower(btrim(coalesce(p_status, 'open')));
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;
  if p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at then
    raise exception 'Invalid time range';
  end if;
  if v_status not in ('open', 'blocked') then
    raise exception 'Invalid availability status';
  end if;

  insert into public.learning_one_to_one_availability (
    teacher_id, starts_at, ends_at, status
  ) values (
    v_uid, p_starts_at, p_ends_at, v_status
  )
  on conflict (teacher_id, starts_at, ends_at)
  do update set
    status = excluded.status,
    updated_at = now()
  returning * into v_row;

  return jsonb_build_object(
    'id', v_row.id,
    'status', v_row.status,
    'starts_at', v_row.starts_at,
    'ends_at', v_row.ends_at
  );
end;
$$;

revoke all on function public.list_learning_one_to_one_availability(uuid, timestamptz, timestamptz)
  from public, anon;
grant execute on function public.list_learning_one_to_one_availability(uuid, timestamptz, timestamptz)
  to authenticated;

revoke all on function public.list_my_learning_one_to_one_bookings()
  from public, anon;
grant execute on function public.list_my_learning_one_to_one_bookings()
  to authenticated;

revoke all on function public.request_learning_one_to_one_booking(uuid)
  from public, anon;
grant execute on function public.request_learning_one_to_one_booking(uuid)
  to authenticated;

revoke all on function public.reschedule_learning_one_to_one_booking(uuid, uuid)
  from public, anon;
grant execute on function public.reschedule_learning_one_to_one_booking(uuid, uuid)
  to authenticated;

revoke all on function public.cancel_learning_one_to_one_booking(uuid, text)
  from public, anon;
grant execute on function public.cancel_learning_one_to_one_booking(uuid, text)
  to authenticated;

revoke all on function public.confirm_learning_one_to_one_booking(uuid)
  from public, anon;
grant execute on function public.confirm_learning_one_to_one_booking(uuid)
  to authenticated;

revoke all on function public.complete_learning_one_to_one_booking(uuid)
  from public, anon;
grant execute on function public.complete_learning_one_to_one_booking(uuid)
  to authenticated;

revoke all on function public.upsert_learning_one_to_one_availability(timestamptz, timestamptz, text)
  from public, anon;
grant execute on function public.upsert_learning_one_to_one_availability(timestamptz, timestamptz, text)
  to authenticated;
