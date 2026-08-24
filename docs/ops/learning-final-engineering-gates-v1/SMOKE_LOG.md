# Learning production smoke — 2026-08-24

Server: `npx next start -p 3018` after `npm run build` (Next 16.2.11).
Worktree `.env.local` key names: `UMTUBA_LEARNING_VISUAL_DEMO`, `NEXT_PUBLIC_UMTUBA_LEARNING_VISUAL_DEMO`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Values not recorded.

| Path | Status | Banner / note |
| --- | --- | --- |
| `/learning` | 200 | LIVE banner present |
| `/learning/catalog` | 200 | LIVE banner present |
| `/learning?surface=library` | 200 | LIVE banner present |
| `/learning/catalog/ja-01` | 200 | LIVE course; real lesson UUIDs |
| `/learning/lessons/<live-uuid>` | 200 | guest/login-sized response (no live banner) |
| `/learning/become-a-teacher` | 200 | login gate (backend env present) |
| `/learning/teacher` | 200 | login gate |
| `/learning/teacher/courses/new` | 200 | login gate |
| `/learning` Accept-Language `ar` | 200 | `lang=ar` `dir=rtl` Arabic banner |

Playwright live captures (200): `11-live-home-desktop`, `12-live-home-mobile`, `13-live-catalog`, `14-live-course-ja-01`, `15-live-arabic-rtl`, `16-live-arabic-rtl-mobile`.
