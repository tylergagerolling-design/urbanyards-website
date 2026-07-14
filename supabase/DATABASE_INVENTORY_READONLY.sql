-- Urban Yards Dashboard Rebuild V2
-- Read-only Supabase database inventory.
--
-- Purpose:
--   Run this before any dashboard rebuild migration. It inventories the current
--   database without resetting, dropping, altering, inserting, updating, or
--   deleting anything.
--
-- Safe to run in Supabase SQL Editor. Export each result set if you need a
-- permanent audit packet.

-- 1. Schemas
select
  n.nspname as schema_name,
  pg_catalog.pg_get_userbyid(n.nspowner) as owner
from pg_catalog.pg_namespace n
where n.nspname not like 'pg_%'
  and n.nspname <> 'information_schema'
order by n.nspname;

-- 2. Tables and approximate row counts
select
  schemaname as schema_name,
  relname as table_name,
  n_live_tup as approximate_live_rows,
  n_dead_tup as approximate_dead_rows,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
from pg_catalog.pg_stat_user_tables
order by schemaname, relname;

-- 3. Columns
select
  table_schema,
  table_name,
  ordinal_position,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default,
  character_maximum_length,
  numeric_precision,
  numeric_scale
from information_schema.columns
where table_schema not in ('pg_catalog', 'information_schema')
order by table_schema, table_name, ordinal_position;

-- 4. Primary keys, unique constraints, foreign keys, and checks
select
  tc.table_schema,
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_schema as foreign_table_schema,
  ccu.table_name as foreign_table_name,
  ccu.column_name as foreign_column_name,
  rc.update_rule,
  rc.delete_rule
from information_schema.table_constraints tc
left join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
  and tc.table_schema = kcu.table_schema
left join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
  and ccu.table_schema = tc.table_schema
left join information_schema.referential_constraints rc
  on rc.constraint_name = tc.constraint_name
  and rc.constraint_schema = tc.table_schema
where tc.table_schema not in ('pg_catalog', 'information_schema')
order by tc.table_schema, tc.table_name, tc.constraint_type, tc.constraint_name, kcu.ordinal_position;

-- 5. Indexes
select
  schemaname as schema_name,
  tablename as table_name,
  indexname as index_name,
  indexdef
from pg_catalog.pg_indexes
where schemaname not in ('pg_catalog', 'information_schema')
order by schemaname, tablename, indexname;

-- 6. Views
select
  table_schema as schema_name,
  table_name as view_name,
  view_definition
from information_schema.views
where table_schema not in ('pg_catalog', 'information_schema')
order by table_schema, table_name;

-- 7. Functions and procedures
select
  n.nspname as schema_name,
  p.proname as routine_name,
  case p.prokind
    when 'f' then 'function'
    when 'p' then 'procedure'
    when 'a' then 'aggregate'
    when 'w' then 'window'
    else p.prokind::text
  end as routine_type,
  pg_catalog.pg_get_function_arguments(p.oid) as arguments,
  pg_catalog.pg_get_function_result(p.oid) as result_type,
  l.lanname as language,
  p.prosecdef as security_definer
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
join pg_catalog.pg_language l on l.oid = p.prolang
where n.nspname not in ('pg_catalog', 'information_schema')
order by n.nspname, p.proname, pg_catalog.pg_get_function_arguments(p.oid);

-- 8. Triggers
select
  trigger_schema,
  event_object_schema as table_schema,
  event_object_table as table_name,
  trigger_name,
  event_manipulation,
  action_timing,
  action_orientation,
  action_statement
from information_schema.triggers
where trigger_schema not in ('pg_catalog', 'information_schema')
order by trigger_schema, event_object_table, trigger_name;

-- 9. Row Level Security status
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where c.relkind in ('r', 'p')
  and n.nspname not in ('pg_catalog', 'information_schema')
order by n.nspname, c.relname;

-- 10. Row Level Security policies
select
  schemaname as schema_name,
  tablename as table_name,
  policyname as policy_name,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_catalog.pg_policies
order by schemaname, tablename, policyname;

-- 11. Storage buckets
select
  id,
  name,
  owner,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at,
  updated_at
from storage.buckets
order by id;

-- 12. Storage object counts by bucket
select
  bucket_id,
  count(*) as object_count,
  max(created_at) as newest_object_at
from storage.objects
group by bucket_id
order by bucket_id;

-- 13. Auth user count only. Does not expose emails or user metadata.
select
  count(*) as auth_user_count
from auth.users;

-- 14. Installed extensions
select
  extname as extension_name,
  extversion as version,
  n.nspname as schema_name
from pg_catalog.pg_extension e
join pg_catalog.pg_namespace n on n.oid = e.extnamespace
order by extname;
