select column_name, data_type
from information_schema.columns
where table_schema = 'auth'
  and table_name = 'users'
  and column_name in ('id', 'email', 'email_confirmed_at')
order by column_name;
