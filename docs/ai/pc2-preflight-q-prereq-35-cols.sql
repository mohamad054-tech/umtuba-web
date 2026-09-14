select column_name, data_type, udt_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
  and column_name in ('id', 'bio', 'bio_long', 'cover_url', 'website_url', 'username', 'display_name', 'full_name', 'avatar_url')
order by column_name;

-- second query may be dropped by CLI; keep one file per result if needed
