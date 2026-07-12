# Supabase setup (UMTUBA P0 auth)

## Environment

Copy `.env.example` to `.env.local` and set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (publishable / anon key only)

Never put the **service role** key in the Next.js app or commit it.

## Apply the SQL migration

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project.
2. Go to **SQL Editor** → **New query**.
3. Paste the full contents of:

   `supabase/migrations/20260712_auth_profiles_posts_rls.sql`

4. Click **Run**.

This creates:

- `public.profiles` (+ signup trigger from `auth.users`)
- `posts.user_id` column
- RLS on `profiles` and `posts` (authenticated insert only for own rows)
- `post-images` storage bucket (public **read** for feed images)
- Storage RLS: authenticated users may upload/update/delete only under `{user_id}/...`

## Auth settings

In **Authentication → Providers**, ensure **Email** is enabled.

If **Confirm email** is enabled, new users must confirm before they get a session. The app will show a clear message in that case. For local Alpha testing you can temporarily disable email confirmation.

## Verify quickly

1. Register at `/register`.
2. Confirm a row appears in `profiles`.
3. Publish a post from `/feed` while signed in.
4. Confirm `posts.user_id` matches your user and storage path is `{user_id}/{file}`.
5. Sign out and confirm publish is blocked.
