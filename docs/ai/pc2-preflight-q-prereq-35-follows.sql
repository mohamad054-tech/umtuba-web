select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profile_follows'
  and column_name in ('follower_id', 'following_id')
order by column_name;
