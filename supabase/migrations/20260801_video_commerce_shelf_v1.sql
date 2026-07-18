-- UMTUBA Video Commerce — Shelf Linking V1
-- Additive. Fail-closed RLS. No cart/checkout from Watch.
-- Buyer shelf reads active attachments only when product is publicly visible.

-- ---------------------------------------------------------------------------
-- Attachments
-- ---------------------------------------------------------------------------

create table if not exists public.video_product_attachments (
  id uuid primary key default gen_random_uuid(),
  post_id bigint not null references public.posts (id) on delete cascade,
  product_id uuid not null references public.store_products (id) on delete cascade,
  sort_order integer not null default 0
    check (sort_order >= 0 and sort_order <= 9999),
  status text not null default 'active'
    check (status in ('pending', 'active', 'rejected', 'removed')),
  -- Null window = available for the full video duration.
  start_ms integer
    check (start_ms is null or start_ms >= 0),
  end_ms integer
    check (end_ms is null or end_ms >= 0),
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint video_product_attachments_unique_product_per_post
    unique (post_id, product_id),
  constraint video_product_attachments_window_check
    check (end_ms is null or start_ms is null or end_ms > start_ms)
);

create index if not exists video_product_attachments_post_id_idx
  on public.video_product_attachments (post_id);

create index if not exists video_product_attachments_product_id_idx
  on public.video_product_attachments (product_id);

create index if not exists video_product_attachments_post_active_idx
  on public.video_product_attachments (post_id, sort_order)
  where status = 'active';

drop trigger if exists video_product_attachments_set_updated_at
  on public.video_product_attachments;
create trigger video_product_attachments_set_updated_at
  before update on public.video_product_attachments
  for each row execute function public.set_row_updated_at();

-- ---------------------------------------------------------------------------
-- Analytics (no purchase events in V1)
-- ---------------------------------------------------------------------------

create table if not exists public.video_commerce_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null
    check (event_type in ('badge_shown', 'badge_opened', 'product_viewed')),
  post_id bigint not null references public.posts (id) on delete cascade,
  product_id uuid references public.store_products (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  client_event_id text
    check (client_event_id is null or char_length(client_event_id) between 8 and 80),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists video_commerce_events_post_id_idx
  on public.video_commerce_events (post_id, created_at desc);

create index if not exists video_commerce_events_type_idx
  on public.video_commerce_events (event_type, created_at desc);

create unique index if not exists video_commerce_events_client_event_uidx
  on public.video_commerce_events (client_event_id)
  where client_event_id is not null;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.can_manage_video_product_attachment(
  p_post_id bigint,
  p_product_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1
      from public.posts p
      where p.id = p_post_id
        and p.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.store_products sp
      where sp.id = p_product_id
        and public.is_store_member_with_role(
          sp.store_id,
          array['owner', 'manager', 'catalog_editor']
        )
    );
$$;

revoke all on function public.can_manage_video_product_attachment(bigint, uuid)
  from public;
grant execute on function public.can_manage_video_product_attachment(bigint, uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.video_product_attachments enable row level security;
alter table public.video_commerce_events enable row level security;

drop policy if exists "Public can read active video product attachments"
  on public.video_product_attachments;
create policy "Public can read active video product attachments"
  on public.video_product_attachments
  for select
  to anon, authenticated
  using (
    status = 'active'
    and exists (
      select 1
      from public.store_products sp
      join public.stores s on s.id = sp.store_id
      where sp.id = product_id
        and sp.status = 'active'
        and sp.moderation_status = 'approved'
        and s.status = 'active'
    )
  );

drop policy if exists "Creators and store editors manage attachments"
  on public.video_product_attachments;
create policy "Creators and store editors manage attachments"
  on public.video_product_attachments
  for all
  to authenticated
  using (public.can_manage_video_product_attachment(post_id, product_id))
  with check (
    created_by = auth.uid()
    and public.can_manage_video_product_attachment(post_id, product_id)
  );

drop policy if exists "Anyone can insert video commerce events"
  on public.video_commerce_events;
create policy "Anyone can insert video commerce events"
  on public.video_commerce_events
  for insert
  to anon, authenticated
  with check (
    user_id is null
    or user_id = auth.uid()
  );

drop policy if exists "Users can read own video commerce events"
  on public.video_commerce_events;
create policy "Users can read own video commerce events"
  on public.video_commerce_events
  for select
  to authenticated
  using (user_id = auth.uid());
