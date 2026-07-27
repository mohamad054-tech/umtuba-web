-- Public catalog data readiness for AI Applications Master Course
-- Course: f8ecde63-818c-49ac-a350-0a4008f20d5f (slug: ai-applications-master-course)
--
-- DATA FIX ONLY — run via: npx supabase db query --linked -f scripts/learning/public-catalog-course-data-v1.sql
-- Do NOT treat this as a schema migration.
--
-- IMPORTANT: Do NOT insert into learning_course_public_previews until migration
-- 20260866_learning_public_course_preview_foundation_v1.sql has been applied.
-- Preview row insert is intentionally omitted here (fail closed until GO + apply).

-- 1) Ensure sections are publicly discoverable (curriculum RLS)
update public.learning_sections
set visibility = 'public',
    updated_at = now()
where course_id = 'f8ecde63-818c-49ac-a350-0a4008f20d5f'
  and visibility is distinct from 'public';

-- 2) Ensure lessons are publicly discoverable (curriculum RLS)
update public.learning_lessons les
set visibility = 'public',
    updated_at = now()
from public.learning_sections sec
where sec.id = les.section_id
  and sec.course_id = 'f8ecde63-818c-49ac-a350-0a4008f20d5f'
  and les.visibility is distinct from 'public';

-- 3) Clean section descriptions that leak package paths / secrets
update public.learning_sections
set description = null,
    updated_at = now()
where course_id = 'f8ecde63-818c-49ac-a350-0a4008f20d5f'
  and description is not null
  and (
    description ilike '%umtuba-package://%'
    or description ilike '%package path%'
    or description ~* '\msk-'
  );

-- 4) Clean lesson descriptions that leak package paths / secrets
update public.learning_lessons les
set description = null,
    updated_at = now()
from public.learning_sections sec
where sec.id = les.section_id
  and sec.course_id = 'f8ecde63-818c-49ac-a350-0a4008f20d5f'
  and les.description is not null
  and (
    les.description ilike '%umtuba-package://%'
    or les.description ilike '%package path%'
    or les.description ~* '\msk-'
  );

-- 5) Verify public catalog chain + visibility counts
select
  c.id,
  c.slug,
  c.status as course_status,
  c.visibility as course_visibility,
  p.status as program_status,
  p.visibility as program_visibility,
  s.status as space_status,
  s.visibility as space_visibility,
  (
    select count(*)
    from public.learning_sections sec
    where sec.course_id = c.id
      and sec.status = 'published'
      and sec.visibility = 'public'
  ) as public_modules,
  (
    select count(*)
    from public.learning_lessons les
    join public.learning_sections sec on sec.id = les.section_id
    where sec.course_id = c.id
      and les.status = 'published'
      and les.visibility = 'public'
      and sec.status = 'published'
      and sec.visibility = 'public'
  ) as public_lessons
from public.learning_courses c
join public.learning_programs p on p.id = c.program_id
join public.learning_spaces s on s.id = p.space_id
where c.id = 'f8ecde63-818c-49ac-a350-0a4008f20d5f';

-- Preview insert blocked until migration applied:
-- insert into public.learning_course_public_previews (...) — DO NOT RUN YET
