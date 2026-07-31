-- =============================================================================
-- Commerce Transactional Notifications V1
-- Extends platform notifications type allowlist + service_role emit helper.
-- Does NOT: email/SMS/push providers, cron, workers, commission/payout/stripe.
-- Idempotent constraint replace. Local apply only — do not remote-apply here.
-- =============================================================================

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

create or replace function public.create_store_commerce_notification(
  p_recipient_id uuid,
  p_actor_id uuid,
  p_type text,
  p_title text,
  p_body text default null,
  p_entity_type text default null,
  p_entity_id text default null,
  p_href text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_dedupe_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_type is null or p_type not like 'commerce_%' then
    raise exception 'Only commerce_* notification types are allowed';
  end if;

  if p_href is not null and (
    position('://' in p_href) > 0
    or left(p_href, 1) <> '/'
    or left(p_href, 2) = '//'
  ) then
    raise exception 'Invalid commerce notification href';
  end if;

  return public.create_notification(
    p_recipient_id,
    p_actor_id,
    p_type,
    p_title,
    p_body,
    p_entity_type,
    p_entity_id,
    p_href,
    coalesce(p_metadata, '{}'::jsonb),
    p_dedupe_key
  );
end;
$$;

revoke all on function public.create_store_commerce_notification(
  uuid, uuid, text, text, text, text, text, text, jsonb, text
) from public, anon, authenticated;

grant execute on function public.create_store_commerce_notification(
  uuid, uuid, text, text, text, text, text, text, jsonb, text
) to service_role;

comment on function public.create_store_commerce_notification(
  uuid, uuid, text, text, text, text, text, text, jsonb, text
) is
  'Commerce Transactional Notifications V1 — service_role wrapper around create_notification for commerce_* types only.';
