-- =============================================================================
-- Commerce Refund Operations Surface V1
-- Durable workflow storage for refund requests + append-only transition audit.
-- Money path remains TypeScript applyFullOrderRefund (Sync + settlement RPCs).
-- Idempotent. Local apply only — do not remote-apply here.
-- Does NOT: partial refunds, Stripe refunds, payout rails, commission, wallets.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0) Notifications allowlist: add refund_rejected / refund_failed
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
      'learning_qa_answered',
      'learning_live_session_scheduled',
      'learning_live_session_updated',
      'learning_live_session_cancelled',
      'commerce_order_created',
      'commerce_payment_pending',
      'commerce_payment_captured',
      'commerce_payment_failed',
      'commerce_order_confirmed',
      'commerce_order_cancelled',
      'commerce_fulfillment_ready',
      'commerce_digital_access_granted',
      'commerce_order_shipped',
      'commerce_order_delivered',
      'commerce_refund_requested',
      'commerce_refund_completed',
      'commerce_refund_rejected',
      'commerce_refund_failed',
      'commerce_product_approved',
      'commerce_product_rejected',
      'commerce_seller_approved',
      'commerce_seller_rejected',
      'commerce_inventory_low',
      'commerce_inventory_out',
      'commerce_payout_ready',
      'commerce_payout_blocked'
    )
  );

-- ---------------------------------------------------------------------------
-- 1) Requests (mutable current state — no client money writes)
-- ---------------------------------------------------------------------------

create table if not exists public.store_refund_operation_requests (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete restrict,
  order_id uuid not null references public.orders (id) on delete restrict,
  payment_attempt_id uuid not null references public.payment_attempts (id) on delete restrict,
  buyer_user_id uuid not null references auth.users (id) on delete restrict,
  seller_user_id uuid not null references auth.users (id) on delete restrict,
  requested_by_user_id uuid not null references auth.users (id) on delete restrict,
  status text not null default 'requested'
    constraint store_refund_operation_requests_status_check check (
      status in (
        'requested',
        'under_review',
        'approved',
        'rejected',
        'processing',
        'completed',
        'failed',
        'cancelled'
      )
    ),
  reason text not null
    check (char_length(btrim(reason)) between 3 and 1000),
  rejection_reason text
    check (rejection_reason is null or char_length(btrim(rejection_reason)) between 3 and 1000),
  failure_code text
    check (failure_code is null or char_length(failure_code) between 1 and 80),
  failure_message_safe text
    check (
      failure_message_safe is null
      or char_length(failure_message_safe) between 1 and 500
    ),
  -- Server-trusted capture amount/currency only (never from client).
  trusted_amount_minor bigint not null
    check (trusted_amount_minor > 0),
  currency text not null
    check (char_length(currency) = 3),
  idempotency_key text not null
    check (char_length(idempotency_key) between 8 and 128),
  execution_idempotency_key text
    check (
      execution_idempotency_key is null
      or char_length(execution_idempotency_key) between 8 and 128
    ),
  reviewed_by_user_id uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  executed_by_user_id uuid references auth.users (id) on delete set null,
  executed_at timestamptz,
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_refund_operation_requests_store_idem_uq
    unique (store_id, idempotency_key)
);

create index if not exists store_refund_operation_requests_store_status_idx
  on public.store_refund_operation_requests (store_id, status, created_at desc);

create index if not exists store_refund_operation_requests_order_idx
  on public.store_refund_operation_requests (order_id, created_at desc);

-- One non-terminal (active) request per order.
create unique index if not exists store_refund_operation_requests_active_order_uq
  on public.store_refund_operation_requests (order_id)
  where status in (
    'requested',
    'under_review',
    'approved',
    'processing'
  );

drop trigger if exists store_refund_operation_requests_set_updated_at
  on public.store_refund_operation_requests;
create trigger store_refund_operation_requests_set_updated_at
  before update on public.store_refund_operation_requests
  for each row execute function public.set_row_updated_at();

-- ---------------------------------------------------------------------------
-- 2) Append-only transition audit
-- ---------------------------------------------------------------------------

create table if not exists public.store_refund_operation_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null
    references public.store_refund_operation_requests (id) on delete restrict,
  store_id uuid not null references public.stores (id) on delete restrict,
  order_id uuid not null references public.orders (id) on delete restrict,
  actor_user_id uuid references auth.users (id) on delete set null,
  event_type text not null
    check (
      event_type in (
        'created',
        'under_review',
        'approved',
        'rejected',
        'cancelled',
        'processing',
        'completed',
        'failed',
        'note'
      )
    ),
  from_status text
    check (
      from_status is null
      or from_status in (
        'requested',
        'under_review',
        'approved',
        'rejected',
        'processing',
        'completed',
        'failed',
        'cancelled'
      )
    ),
  to_status text not null
    check (
      to_status in (
        'requested',
        'under_review',
        'approved',
        'rejected',
        'processing',
        'completed',
        'failed',
        'cancelled'
      )
    ),
  note text
    check (note is null or char_length(note) <= 1000),
  source text not null
    check (source in ('buyer', 'seller', 'admin', 'system')),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists store_refund_operation_events_request_created_idx
  on public.store_refund_operation_events (request_id, created_at asc);

create or replace function public.store_refund_operation_events_forbid_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'store_refund_operation_events is append-only';
end;
$$;

drop trigger if exists store_refund_operation_events_no_update
  on public.store_refund_operation_events;
create trigger store_refund_operation_events_no_update
  before update on public.store_refund_operation_events
  for each row execute function public.store_refund_operation_events_forbid_mutation();

drop trigger if exists store_refund_operation_events_no_delete
  on public.store_refund_operation_events;
create trigger store_refund_operation_events_no_delete
  before delete on public.store_refund_operation_events
  for each row execute function public.store_refund_operation_events_forbid_mutation();

-- ---------------------------------------------------------------------------
-- 3) RLS
-- ---------------------------------------------------------------------------

alter table public.store_refund_operation_requests enable row level security;
alter table public.store_refund_operation_requests force row level security;
alter table public.store_refund_operation_events enable row level security;
alter table public.store_refund_operation_events force row level security;

revoke all on public.store_refund_operation_requests from anon, public;
grant select on public.store_refund_operation_requests to authenticated;
revoke insert, update, delete on public.store_refund_operation_requests from authenticated;
grant all on public.store_refund_operation_requests to service_role;

revoke all on public.store_refund_operation_events from anon, public;
grant select on public.store_refund_operation_events to authenticated;
revoke insert, update, delete on public.store_refund_operation_events from authenticated;
grant all on public.store_refund_operation_events to service_role;

drop policy if exists "Read refund ops requests via order"
  on public.store_refund_operation_requests;
create policy "Read refund ops requests via order"
  on public.store_refund_operation_requests for select to authenticated
  using (
    public.can_read_store_order(order_id)
    or public.is_platform_admin()
  );

drop policy if exists "Read refund ops events via order"
  on public.store_refund_operation_events;
create policy "Read refund ops events via order"
  on public.store_refund_operation_events for select to authenticated
  using (
    public.can_read_store_order(order_id)
    or public.is_platform_admin()
  );

-- ---------------------------------------------------------------------------
-- 4) Transition helper (pure)
-- ---------------------------------------------------------------------------

create or replace function public.store_refund_ops_transition_allowed(
  p_from text,
  p_to text
)
returns boolean
language sql
immutable
as $$
  select case
    when p_from = 'requested' and p_to in ('under_review', 'rejected', 'cancelled') then true
    when p_from = 'under_review' and p_to in ('approved', 'rejected', 'cancelled') then true
    when p_from = 'approved' and p_to in ('processing', 'cancelled') then true
    when p_from = 'processing' and p_to in ('completed', 'failed') then true
    when p_from = 'failed' and p_to = 'processing' then true
    else false
  end;
$$;

revoke all on function public.store_refund_ops_transition_allowed(text, text)
  from public, anon;
grant execute on function public.store_refund_ops_transition_allowed(text, text)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5) Create request (seller owner/manager or platform admin)
-- ---------------------------------------------------------------------------

create or replace function public.create_store_refund_operation_request(
  p_store_id uuid,
  p_order_id uuid,
  p_reason text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  is_admin boolean := public.is_platform_admin();
  o public.orders%rowtype;
  attempt public.payment_attempts%rowtype;
  capture public.store_payment_outcome_events%rowtype;
  seller_id uuid;
  reason_text text := btrim(coalesce(p_reason, ''));
  idem text := btrim(coalesce(p_idempotency_key, ''));
  existing public.store_refund_operation_requests%rowtype;
  created public.store_refund_operation_requests%rowtype;
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;
  if p_store_id is null or p_order_id is null then
    raise exception 'store_id and order_id are required';
  end if;
  if char_length(reason_text) < 3 or char_length(reason_text) > 1000 then
    raise exception 'Invalid refund reason';
  end if;
  if char_length(idem) < 8 or char_length(idem) > 128 then
    raise exception 'Invalid idempotency key';
  end if;

  if not is_admin
     and not public.is_store_member_with_role(
       p_store_id,
       array['owner', 'manager']
     ) then
    raise exception 'Not authorized for this store';
  end if;

  select * into o
  from public.orders
  where id = p_order_id
  for share;

  if not found then
    raise exception 'Order not found';
  end if;
  if o.store_id is distinct from p_store_id then
    raise exception 'Order does not belong to store';
  end if;
  if o.payment_status is distinct from 'paid' then
    raise exception 'Order is not refundable';
  end if;
  if o.status = 'refunded' or o.payment_status = 'refunded' then
    raise exception 'Order already refunded';
  end if;

  -- Idempotent replay (same store + key).
  select * into existing
  from public.store_refund_operation_requests r
  where r.store_id = p_store_id
    and r.idempotency_key = idem;

  if found then
    if existing.order_id is distinct from p_order_id
       or btrim(existing.reason) is distinct from reason_text then
      raise exception 'Idempotency key conflict';
    end if;
    return jsonb_build_object(
      'ok', true,
      'replayed', true,
      'request', to_jsonb(existing)
    );
  end if;

  -- Block duplicate active request for order.
  if exists (
    select 1
    from public.store_refund_operation_requests r
    where r.order_id = p_order_id
      and r.status in ('requested', 'under_review', 'approved', 'processing')
  ) then
    raise exception 'Active refund request already exists for order';
  end if;

  select * into attempt
  from public.payment_attempts pa
  where pa.order_id = o.id
    and pa.status = 'captured'
  order by pa.created_at desc
  limit 1;

  if not found then
    raise exception 'Captured payment attempt required';
  end if;

  select * into capture
  from public.store_payment_outcome_events e
  where e.payment_attempt_id = attempt.id
    and e.outcome = 'captured'
  order by e.created_at asc
  limit 1;

  if not found then
    raise exception 'Trusted capture outcome required';
  end if;

  if exists (
    select 1
    from public.store_payment_outcome_events e
    where e.payment_attempt_id = attempt.id
      and e.outcome = 'refunded'
  ) then
    raise exception 'Payment already refunded';
  end if;

  select s.owner_user_id into seller_id
  from public.stores s
  where s.id = p_store_id;

  if seller_id is null then
    raise exception 'Store owner missing';
  end if;

  insert into public.store_refund_operation_requests (
    store_id,
    order_id,
    payment_attempt_id,
    buyer_user_id,
    seller_user_id,
    requested_by_user_id,
    status,
    reason,
    trusted_amount_minor,
    currency,
    idempotency_key,
    metadata
  ) values (
    p_store_id,
    p_order_id,
    attempt.id,
    o.buyer_id,
    seller_id,
    uid,
    'requested',
    reason_text,
    capture.amount_minor,
    upper(capture.currency),
    idem,
    jsonb_build_object(
      'source', case when is_admin then 'admin' else 'seller' end
    )
  )
  returning * into created;

  insert into public.store_refund_operation_events (
    request_id, store_id, order_id, actor_user_id,
    event_type, from_status, to_status, note, source, metadata
  ) values (
    created.id, created.store_id, created.order_id, uid,
    'created', null, 'requested', reason_text,
    case when is_admin then 'admin' else 'seller' end,
    '{}'::jsonb
  );

  return jsonb_build_object(
    'ok', true,
    'replayed', false,
    'request', to_jsonb(created)
  );
exception
  when unique_violation then
    -- Race on idempotency or active-order unique.
    select * into existing
    from public.store_refund_operation_requests r
    where r.store_id = p_store_id
      and r.idempotency_key = idem;
    if found then
      if existing.order_id is distinct from p_order_id
         or btrim(existing.reason) is distinct from reason_text then
        raise exception 'Idempotency key conflict';
      end if;
      return jsonb_build_object(
        'ok', true,
        'replayed', true,
        'request', to_jsonb(existing)
      );
    end if;
    raise exception 'Active refund request already exists for order';
end;
$$;

revoke all on function public.create_store_refund_operation_request(uuid, uuid, text, text)
  from public, anon;
grant execute on function public.create_store_refund_operation_request(uuid, uuid, text, text)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6) Admin / seller transitions (status only)
-- ---------------------------------------------------------------------------

create or replace function public.transition_store_refund_operation_request(
  p_request_id uuid,
  p_to_status text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  is_admin boolean := public.is_platform_admin();
  req public.store_refund_operation_requests%rowtype;
  from_status text;
  note_text text := nullif(btrim(coalesce(p_note, '')), '');
  src text;
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;
  if p_request_id is null or p_to_status is null then
    raise exception 'request_id and to_status are required';
  end if;

  select * into req
  from public.store_refund_operation_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Refund request not found';
  end if;

  from_status := req.status;

  if p_to_status in ('processing', 'completed', 'failed') then
    raise exception 'Use mark_store_refund_operation_execution for execution states';
  end if;

  if not public.store_refund_ops_transition_allowed(from_status, p_to_status) then
    raise exception 'Illegal refund status transition';
  end if;

  if p_to_status in ('under_review', 'approved', 'rejected') then
    if not is_admin then
      raise exception 'Platform admin required';
    end if;
  elsif p_to_status = 'cancelled' then
    if not is_admin
       and not public.is_store_member_with_role(
         req.store_id,
         array['owner', 'manager']
       ) then
      raise exception 'Not authorized to cancel refund request';
    end if;
  else
    raise exception 'Unsupported refund transition';
  end if;

  if p_to_status = 'rejected' then
    if note_text is null or char_length(note_text) < 3 then
      raise exception 'Rejection reason is required';
    end if;
  end if;

  src := case when is_admin then 'admin' else 'seller' end;

  update public.store_refund_operation_requests r
  set
    status = p_to_status,
    rejection_reason = case
      when p_to_status = 'rejected' then note_text
      else r.rejection_reason
    end,
    reviewed_by_user_id = case
      when p_to_status in ('under_review', 'approved', 'rejected') then uid
      else r.reviewed_by_user_id
    end,
    reviewed_at = case
      when p_to_status in ('under_review', 'approved', 'rejected') then now()
      else r.reviewed_at
    end
  where r.id = req.id
  returning * into req;

  insert into public.store_refund_operation_events (
    request_id, store_id, order_id, actor_user_id,
    event_type, from_status, to_status, note, source
  ) values (
    req.id, req.store_id, req.order_id, uid,
    p_to_status, from_status, p_to_status, note_text, src
  );

  return jsonb_build_object('ok', true, 'request', to_jsonb(req));
end;
$$;

revoke all on function public.transition_store_refund_operation_request(uuid, text, text)
  from public, anon;
grant execute on function public.transition_store_refund_operation_request(uuid, text, text)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 7) Execution status marks (admin or service_role after TS money path)
-- ---------------------------------------------------------------------------

create or replace function public.mark_store_refund_operation_execution(
  p_request_id uuid,
  p_to_status text,
  p_execution_idempotency_key text default null,
  p_failure_code text default null,
  p_failure_message_safe text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  is_admin boolean := public.is_platform_admin();
  req public.store_refund_operation_requests%rowtype;
  from_status text;
  exec_key text := nullif(btrim(coalesce(p_execution_idempotency_key, '')), '');
  fail_code text := nullif(btrim(coalesce(p_failure_code, '')), '');
  fail_msg text := nullif(btrim(coalesce(p_failure_message_safe, '')), '');
begin
  -- service_role has null auth.uid(); allow when JWT role is service_role OR admin.
  if uid is null and coalesce(auth.role(), '') is distinct from 'service_role' then
    raise exception 'Authentication required';
  end if;
  if uid is not null and not is_admin and coalesce(auth.role(), '') is distinct from 'service_role' then
    raise exception 'Platform admin required';
  end if;
  if p_to_status not in ('processing', 'completed', 'failed') then
    raise exception 'Invalid execution status';
  end if;

  select * into req
  from public.store_refund_operation_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Refund request not found';
  end if;

  from_status := req.status;

  -- Execution idempotency replay: same key + already completed/failed/processing.
  if exec_key is not null
     and req.execution_idempotency_key is not null
     and req.execution_idempotency_key = exec_key
     and req.status in ('processing', 'completed', 'failed') then
    return jsonb_build_object(
      'ok', true,
      'replayed', true,
      'request', to_jsonb(req)
    );
  end if;

  if exec_key is not null
     and req.execution_idempotency_key is not null
     and req.execution_idempotency_key is distinct from exec_key
     and req.status in ('processing', 'completed') then
    raise exception 'Execution idempotency key conflict';
  end if;

  if not public.store_refund_ops_transition_allowed(from_status, p_to_status) then
    raise exception 'Illegal refund status transition';
  end if;

  if p_to_status = 'failed' then
    if fail_code is null or fail_msg is null then
      raise exception 'Safe failure code and message are required';
    end if;
  end if;

  update public.store_refund_operation_requests r
  set
    status = p_to_status,
    execution_idempotency_key = coalesce(exec_key, r.execution_idempotency_key),
    failure_code = case when p_to_status = 'failed' then fail_code else r.failure_code end,
    failure_message_safe = case when p_to_status = 'failed' then left(fail_msg, 500) else r.failure_message_safe end,
    executed_by_user_id = coalesce(uid, r.executed_by_user_id),
    executed_at = case
      when p_to_status = 'processing' then coalesce(r.executed_at, now())
      else r.executed_at
    end,
    completed_at = case
      when p_to_status = 'completed' then now()
      else r.completed_at
    end
  where r.id = req.id
  returning * into req;

  insert into public.store_refund_operation_events (
    request_id, store_id, order_id, actor_user_id,
    event_type, from_status, to_status, note, source, metadata
  ) values (
    req.id, req.store_id, req.order_id, uid,
    p_to_status, from_status, p_to_status,
    case when p_to_status = 'failed' then fail_msg else null end,
    case when uid is null then 'system' else 'admin' end,
    jsonb_build_object(
      'failure_code', fail_code,
      'execution_idempotency_key', exec_key
    )
  );

  return jsonb_build_object(
    'ok', true,
    'replayed', false,
    'request', to_jsonb(req)
  );
end;
$$;

revoke all on function public.mark_store_refund_operation_execution(uuid, text, text, text, text)
  from public, anon;
grant execute on function public.mark_store_refund_operation_execution(uuid, text, text, text, text)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 8) Read RPCs
-- ---------------------------------------------------------------------------

create or replace function public.admin_list_store_refund_operations(
  p_limit integer default 50,
  p_status text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  lim integer := greatest(1, least(coalesce(p_limit, 50), 100));
  rows jsonb;
begin
  perform public.require_platform_admin();

  select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc), '[]'::jsonb)
  into rows
  from (
    select *
    from public.store_refund_operation_requests req
    where p_status is null or req.status = p_status
    order by req.created_at desc
    limit lim
  ) r;

  return jsonb_build_object('ok', true, 'requests', rows);
end;
$$;

revoke all on function public.admin_list_store_refund_operations(integer, text)
  from public, anon;
grant execute on function public.admin_list_store_refund_operations(integer, text)
  to authenticated, service_role;

create or replace function public.get_store_refund_operations_for_order(
  p_order_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  rows jsonb;
  events jsonb;
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;
  if p_order_id is null then
    raise exception 'order_id is required';
  end if;
  if not public.can_read_store_order(p_order_id) and not public.is_platform_admin() then
    raise exception 'Not authorized for this order';
  end if;

  select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc), '[]'::jsonb)
  into rows
  from public.store_refund_operation_requests r
  where r.order_id = p_order_id;

  select coalesce(jsonb_agg(to_jsonb(e) order by e.created_at asc), '[]'::jsonb)
  into events
  from public.store_refund_operation_events e
  where e.order_id = p_order_id;

  return jsonb_build_object(
    'ok', true,
    'requests', rows,
    'events', events
  );
end;
$$;

revoke all on function public.get_store_refund_operations_for_order(uuid)
  from public, anon;
grant execute on function public.get_store_refund_operations_for_order(uuid)
  to authenticated, service_role;

create or replace function public.admin_get_store_refund_operation(
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  req public.store_refund_operation_requests%rowtype;
  events jsonb;
begin
  perform public.require_platform_admin();
  if p_request_id is null then
    raise exception 'request_id is required';
  end if;

  select * into req
  from public.store_refund_operation_requests
  where id = p_request_id;

  if not found then
    raise exception 'Refund request not found';
  end if;

  select coalesce(jsonb_agg(to_jsonb(e) order by e.created_at asc), '[]'::jsonb)
  into events
  from public.store_refund_operation_events e
  where e.request_id = p_request_id;

  return jsonb_build_object(
    'ok', true,
    'request', to_jsonb(req),
    'events', events
  );
end;
$$;

revoke all on function public.admin_get_store_refund_operation(uuid)
  from public, anon;
grant execute on function public.admin_get_store_refund_operation(uuid)
  to authenticated, service_role;
