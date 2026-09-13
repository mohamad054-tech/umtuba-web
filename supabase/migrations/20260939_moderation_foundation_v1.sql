BEGIN;

-- Soft delete for posts (currently deletion is permanent — no recovery possible)
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Post visibility scope
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public';

ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_visibility_check;
ALTER TABLE public.posts ADD CONSTRAINT posts_visibility_check
  CHECK (visibility IN ('public','followers','private'));

-- Account moderation state (there is currently NO way to ban a user)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'active';

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_moderation_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_moderation_status_check
  CHECK (moderation_status IN ('active','shadowbanned','suspended','banned'));

-- Per-user privacy preferences, safe defaults
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS privacy_settings jsonb NOT NULL
  DEFAULT '{"city":"private","country":"private","full_name":"private"}'::jsonb;

CREATE INDEX IF NOT EXISTS posts_visibility_deleted_idx
  ON public.posts (visibility, deleted_at) WHERE deleted_at IS NULL;

-- Hide the 6 orphaned posts (user_id IS NULL) instead of deleting them
UPDATE public.posts SET visibility = 'private' WHERE user_id IS NULL;

-- Username availability check that does not require reading the profiles table
CREATE OR REPLACE FUNCTION public.is_username_available(candidate text)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp STABLE
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE lower(username) = lower(trim(candidate))
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_username_available(text) TO anon, authenticated;

COMMIT;
