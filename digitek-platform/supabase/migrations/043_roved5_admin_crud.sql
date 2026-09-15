-- Roved5 admin CRUD — the app becomes the single source of truth.
-- Decision (15.09.2026): manual product management replaces the weekly Google
-- Sheet sync. The cron is disabled so admin edits are no longer wiped every Sunday.
-- Two admin-only RPCs are added for non-destructive upsert (by id) + single delete.

-- ---------------------------------------------------------------------------
-- 1. Disable the weekly Google Sheet sync
--    (roved5_replace_all + roved5_cron_trigger + sync-roved5 Edge Function stay
--     in place, dormant — can be re-enabled later if the user ever wants it.)
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

COMMENT ON TABLE public.roved5_services IS
  'Roved5 catalog. Source of truth = the app (admin CRUD + Excel upload). Weekly Google Sheet sync disabled 15.09.2026.';

-- ---------------------------------------------------------------------------
-- 2. Admin upsert — non-destructive merge by id (מק"ט). Adds new products,
--    updates existing ones, never touches the rest.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.roved5_admin_upsert(p_data jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count integer;
BEGIN
  IF NOT COALESCE((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), false) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF jsonb_typeof(p_data) <> 'array' THEN
    RAISE EXCEPTION 'p_data must be a JSON array';
  END IF;
  IF jsonb_array_length(p_data) = 0 THEN
    RETURN 0;
  END IF;

  INSERT INTO public.roved5_services (
    id, cloud, provider, manufacturer, name, description,
    type, discount, price_link, contact, approval_date, notes, ps_services, synced_at
  )
  SELECT
    x.id, x.cloud, x.provider, x.manufacturer, x.name, x.description,
    x.type, x.discount, x.price_link, x.contact, x.approval_date, x.notes, x.ps_services, now()
  FROM jsonb_to_recordset(p_data) AS x(
    id text, cloud text, provider text, manufacturer text, name text, description text,
    type text, discount numeric, price_link text, contact text, approval_date text, notes text, ps_services text
  )
  ON CONFLICT (id) DO UPDATE SET
    cloud         = EXCLUDED.cloud,
    provider      = EXCLUDED.provider,
    manufacturer  = EXCLUDED.manufacturer,
    name          = EXCLUDED.name,
    description   = EXCLUDED.description,
    type          = EXCLUDED.type,
    discount      = EXCLUDED.discount,
    price_link    = EXCLUDED.price_link,
    contact       = EXCLUDED.contact,
    approval_date = EXCLUDED.approval_date,
    notes         = EXCLUDED.notes,
    ps_services   = EXCLUDED.ps_services,
    synced_at     = now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.roved5_admin_upsert(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.roved5_admin_upsert(jsonb) TO authenticated;

COMMENT ON FUNCTION public.roved5_admin_upsert(jsonb) IS
  'Admin-only upsert (merge by id) of roved5_services. Enforces profiles.is_admin.';

-- ---------------------------------------------------------------------------
-- 3. Admin delete — remove a single product by id
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.roved5_admin_delete(p_id text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count integer;
BEGIN
  IF NOT COALESCE((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), false) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  DELETE FROM public.roved5_services WHERE id = p_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.roved5_admin_delete(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.roved5_admin_delete(text) TO authenticated;

COMMENT ON FUNCTION public.roved5_admin_delete(text) IS
  'Admin-only single-row delete of roved5_services. Enforces profiles.is_admin.';
