-- Smoke test: award, dedupe, self-block, reverse, snapshot.
with u as (
  select id as user_id from auth.users order by created_at asc limit 1
),
params as (
  select
    u.user_id,
    'verify_activity_quality:' || u.user_id::text || ':' || floor(extract(epoch from clock_timestamp()))::text as dedupe
  from u
),
award as (
  select public.award_activity_score_to_user(
    p.user_id, 40, 'quality_posts', 'verify quality post',
    p.dedupe, '{}'::jsonb, 120
  ) as result, p.user_id, p.dedupe
  from params p
),
dup as (
  select public.award_activity_score_to_user(
    a.user_id, 40, 'quality_posts', 'verify quality post',
    a.dedupe, '{}'::jsonb, 120
  ) as result
  from award a
),
self_block as (
  select public.try_award_activity_score(
    a.user_id, 3, 'engagement_received', 'self like',
    'verify_self:' || a.user_id::text || ':' || floor(extract(epoch from clock_timestamp()))::text,
    '{}'::jsonb, a.user_id, 100
  ) as result
  from award a
),
ledger as (
  select l.id
  from public.activity_score_ledger l
  join award a on a.user_id = l.user_id and a.dedupe = l.dedupe_key
  limit 1
),
rev as (
  select public.reverse_activity_score_entry(l.id, 'verify_fraud_reversal', a.user_id) as result
  from ledger l, award a
),
snap as (
  select public.get_activity_tier_snapshot(a.user_id) as result
  from award a
)
select 'award' as step, result from award
union all select 'dup', result from dup
union all select 'self', result from self_block
union all select 'rev', result from rev
union all select 'sum', result from snap;
