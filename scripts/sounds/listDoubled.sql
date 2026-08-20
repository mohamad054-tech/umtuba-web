select name
from storage.objects
where bucket_id = 'social-sounds'
  and name like 'sounds/sounds/%'
order by name
limit 3;
