select version, name
from supabase_migrations.schema_migrations
where name ilike '%rich_personal_profile%'
   or name ilike '%communications_identity%'
   or name ilike '%identity_discovery%'
   or name ilike '%learning_teacher_student%'
order by version;
