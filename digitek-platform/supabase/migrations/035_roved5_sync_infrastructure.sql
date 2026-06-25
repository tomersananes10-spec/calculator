-- Roved5 weekly sync infrastructure.
-- Replaces the static src/data/roved5Services.json bundle with a Supabase-managed
-- table that is fully replaced every Sunday by the sync-roved5 Edge Function via pg_cron.

-- ---------------------------------------------------------------------------
-- 1. Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net  WITH SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- 2. Catalog table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.roved5_services (
  id            text PRIMARY KEY,
  cloud         text NOT NULL CHECK (cloud IN ('AWS', 'GCP')),
  provider      text NOT NULL DEFAULT '',
  manufacturer  text NOT NULL DEFAULT '',
  name          text NOT NULL DEFAULT '',
  description   text NOT NULL DEFAULT '',
  type          text NOT NULL DEFAULT 'non-SaaS' CHECK (type IN ('SaaS', 'non-SaaS')),
  discount      numeric,
  price_link    text NOT NULL DEFAULT '',
  contact       text NOT NULL DEFAULT '',
  approval_date text NOT NULL DEFAULT '',
  notes         text NOT NULL DEFAULT '',
  ps_services   text NOT NULL DEFAULT '',
  synced_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS roved5_services_cloud_idx ON public.roved5_services (cloud);
CREATE INDEX IF NOT EXISTS roved5_services_type_idx  ON public.roved5_services (type);

ALTER TABLE public.roved5_services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "roved5_services_select_anon" ON public.roved5_services;
CREATE POLICY "roved5_services_select_anon"
  ON public.roved5_services
  FOR SELECT
  TO anon, authenticated
  USING (true);

COMMENT ON TABLE public.roved5_services IS
  'Roved5 catalog. Source: Google Sheet 1tVqGbXrEadyMOkvq1qL--85RiAVHF-uQ. Synced weekly by sync-roved5 Edge Function via pg_cron.';

-- ---------------------------------------------------------------------------
-- 3. Secrets table (cron_secret used by Edge Function + pg_cron)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_secrets (
  key        text PRIMARY KEY,
  value      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_secrets FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_secrets TO service_role;

-- Generate a fresh random secret if none exists. ON CONFLICT preserves the
-- value already set in the live database. Never commit the actual secret.
INSERT INTO public.app_secrets (key, value)
VALUES ('cron_secret', encode(extensions.gen_random_bytes(32), 'hex'))
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE public.app_secrets IS
  'System secrets used by Edge Functions + pg_cron. RLS-locked to service_role only.';

-- ---------------------------------------------------------------------------
-- 4. Atomic full-replace RPC
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.roved5_replace_all(p_data jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count integer;
BEGIN
  IF jsonb_typeof(p_data) <> 'array' THEN
    RAISE EXCEPTION 'p_data must be a JSON array';
  END IF;
  IF jsonb_array_length(p_data) = 0 THEN
    RAISE EXCEPTION 'refusing to wipe table with empty input';
  END IF;

  -- Supabase blocks unqualified DELETE/UPDATE. Tautology WHERE clears all rows.
  DELETE FROM public.roved5_services WHERE id IS NOT NULL;

  INSERT INTO public.roved5_services (
    id, cloud, provider, manufacturer, name, description,
    type, discount, price_link, contact, approval_date, notes, ps_services
  )
  SELECT
    x.id, x.cloud, x.provider, x.manufacturer, x.name, x.description,
    x.type, x.discount, x.price_link, x.contact, x.approval_date, x.notes, x.ps_services
  FROM jsonb_to_recordset(p_data) AS x(
    id text, cloud text, provider text, manufacturer text, name text, description text,
    type text, discount numeric, price_link text, contact text, approval_date text, notes text, ps_services text
  );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.roved5_replace_all(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.roved5_replace_all(jsonb) TO service_role;

COMMENT ON FUNCTION public.roved5_replace_all(jsonb) IS
  'Atomic full-replace of roved5_services. Called by sync-roved5 Edge Function. service_role only.';

-- ---------------------------------------------------------------------------
-- 5. pg_cron trigger function — calls the Edge Function via pg_net
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.roved5_cron_trigger()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_secret  text;
  v_request bigint;
BEGIN
  SELECT value INTO v_secret FROM public.app_secrets WHERE key = 'cron_secret';
  IF v_secret IS NULL THEN
    RAISE EXCEPTION 'cron_secret missing from app_secrets';
  END IF;

  SELECT net.http_post(
    url     := 'https://ildwyncxoytvallkrqjo.supabase.co/functions/v1/sync-roved5',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 60000
  ) INTO v_request;

  RETURN v_request;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.roved5_cron_trigger() FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- 6. Weekly cron schedule — Sunday 00:00 UTC (≈ Sunday 02:00–03:00 Israel time)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_jobid bigint;
BEGIN
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'roved5-weekly-sync';
  IF v_jobid IS NOT NULL THEN
    PERFORM cron.unschedule(v_jobid);
  END IF;
END $$;

SELECT cron.schedule(
  'roved5-weekly-sync',
  '0 0 * * 0',
  $cron$ SELECT public.roved5_cron_trigger(); $cron$
);
