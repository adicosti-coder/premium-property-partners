-- Instantaneu de sănătate a bazei pentru pagina admin „Stare bază de date”.
CREATE OR REPLACE FUNCTION public.admin_db_health_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'captured_at', now(),
    'db_size_bytes', pg_database_size(current_database()),
    'stats_reset', d.stats_reset,
    'blocks_read_disk', d.blks_read,
    'blocks_read_cache', d.blks_hit,
    'cache_hit_pct', CASE WHEN d.blks_read + d.blks_hit = 0 THEN NULL
                     ELSE round(100.0 * d.blks_hit / (d.blks_read + d.blks_hit), 2) END,
    'rows_read', d.tup_returned + d.tup_fetched,
    'rows_inserted', d.tup_inserted,
    'rows_updated', d.tup_updated,
    'rows_deleted', d.tup_deleted,
    'temp_bytes', d.temp_bytes,
    'deadlocks', d.deadlocks,
    'connections_active', (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database() AND state = 'active'),
    'connections_total', (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()),
    'connections_max', current_setting('max_connections')::int,
    'shared_buffers', current_setting('shared_buffers'),
    'top_tables', (
      SELECT jsonb_agg(t) FROM (
        SELECT c.relname AS name,
               pg_total_relation_size(c.oid) AS bytes,
               COALESCE(s.n_tup_ins + s.n_tup_upd + s.n_tup_del, 0) AS writes,
               COALESCE(s.seq_tup_read + COALESCE(s.idx_tup_fetch, 0), 0) AS reads
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        LEFT JOIN pg_stat_user_tables s ON s.relid = c.oid
        WHERE c.relkind = 'r' AND n.nspname IN ('public', 'cron')
        ORDER BY pg_total_relation_size(c.oid) DESC
        LIMIT 10
      ) t
    )
  ) INTO result
  FROM pg_stat_database d
  WHERE d.datname = current_database();

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_db_health_snapshot() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_db_health_snapshot() TO authenticated;