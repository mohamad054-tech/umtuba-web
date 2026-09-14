select
  to_regclass('public.learning_teacher_profiles') is not null as learning_teacher_profiles_exists,
  to_regclass('public.learning_teacher_course_products') is not null as learning_teacher_course_products_exists,
  to_regclass('public.learning_course_reviews') is not null as learning_course_reviews_exists,
  to_regclass('public.learning_teacher_earnings_entries') is not null as learning_teacher_earnings_exists,
  to_regclass('public.learning_welcome_video_hooks') is not null as learning_welcome_video_hooks_exists,
  exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'is_approved_learning_teacher'
  ) as is_approved_learning_teacher_exists;
