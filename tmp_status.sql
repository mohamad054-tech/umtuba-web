select conname, pg_get_constraintdef(oid) as def
from pg_constraint
where conname in ('stores_status_check','store_products_status_check');
