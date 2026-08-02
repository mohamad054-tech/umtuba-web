SELECT tgname, rel.relname AS table_name, pg_get_triggerdef(t.oid) AS definition
FROM pg_trigger t
JOIN pg_class rel ON rel.oid=t.tgrelid
JOIN pg_namespace n ON n.oid=rel.relnamespace
WHERE n.nspname='public' AND rel.relname LIKE 'ueos_%' AND NOT t.tgisinternal
ORDER BY 2,1;
