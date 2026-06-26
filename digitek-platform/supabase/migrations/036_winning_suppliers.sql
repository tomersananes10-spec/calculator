-- Winning Suppliers catalog (נספח ד2 — מכרז דיגטק 07-2023, הודעה 16.2.19).
-- Source: official Excel "רשימת ספקים זוכים מעולמות הטק.xlsx".
-- Updated rarely (every few years when a new government tender concludes), so
-- there is no pg_cron schedule — the sync-suppliers Edge Function is invoked
-- manually with the cron_secret when a new Excel arrives.

-- ---------------------------------------------------------------------------
-- 1. Tables (4)
-- ---------------------------------------------------------------------------

-- 1.1 Service clusters (7 fixed clusters from the tender)
CREATE TABLE IF NOT EXISTS public.service_clusters (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  slug        text NOT NULL UNIQUE,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- 1.2 Service specializations (~42, each belongs to a cluster, maps to a catalog SKU)
CREATE TABLE IF NOT EXISTS public.service_specializations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id      uuid NOT NULL REFERENCES public.service_clusters(id) ON DELETE RESTRICT,
  name            text NOT NULL,
  name_normalized text NOT NULL,
  catalog_number  text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cluster_id, name)
);

CREATE INDEX IF NOT EXISTS service_specializations_cluster_idx ON public.service_specializations (cluster_id);

-- 1.3 Winning suppliers (148, 1:1 with framework agreement)
CREATE TABLE IF NOT EXISTS public.winning_suppliers (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL,
  manof_number        text,
  sigma_supplier_no   text,
  sigma_agreement_no  text,
  agreement_name      text,
  valid_from          date,
  valid_to            date,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, sigma_agreement_no)
);

CREATE INDEX IF NOT EXISTS winning_suppliers_name_idx ON public.winning_suppliers (name);

-- 1.4 Qualifications cross-table (supplier × specialization × size, ~694 rows)
CREATE TABLE IF NOT EXISTS public.winning_supplier_qualifications (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id       uuid NOT NULL REFERENCES public.winning_suppliers(id) ON DELETE CASCADE,
  specialization_id uuid NOT NULL REFERENCES public.service_specializations(id) ON DELETE RESTRICT,
  size              text CHECK (size IN ('גדול','קטן') OR size IS NULL),
  catalog_number    text,
  source_row        integer,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (supplier_id, specialization_id, size)
);

CREATE INDEX IF NOT EXISTS qualifications_supplier_idx       ON public.winning_supplier_qualifications (supplier_id);
CREATE INDEX IF NOT EXISTS qualifications_specialization_idx ON public.winning_supplier_qualifications (specialization_id);

COMMENT ON TABLE public.winning_suppliers IS
  'Winning suppliers from tender דיגטק 07-2023 (תכ"ם 16.2.19). Updated rarely, manual Edge Function invocation.';

-- ---------------------------------------------------------------------------
-- 2. RLS — read for all authenticated + anon, write only via service_role
-- ---------------------------------------------------------------------------
ALTER TABLE public.service_clusters                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_specializations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.winning_suppliers                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.winning_supplier_qualifications  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_clusters_select_all"      ON public.service_clusters;
DROP POLICY IF EXISTS "service_specs_select_all"         ON public.service_specializations;
DROP POLICY IF EXISTS "winning_suppliers_select_all"     ON public.winning_suppliers;
DROP POLICY IF EXISTS "qualifications_select_all"        ON public.winning_supplier_qualifications;

CREATE POLICY "service_clusters_select_all"      ON public.service_clusters                FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "service_specs_select_all"         ON public.service_specializations         FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "winning_suppliers_select_all"     ON public.winning_suppliers               FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "qualifications_select_all"        ON public.winning_supplier_qualifications FOR SELECT TO anon, authenticated USING (true);

-- ---------------------------------------------------------------------------
-- 3. Denormalized read view
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_winning_suppliers_flat AS
SELECT q.id                                            AS qualification_id,
       s.id                                            AS supplier_id,
       s.name                                          AS supplier_name,
       s.manof_number,
       s.sigma_supplier_no,
       s.sigma_agreement_no,
       s.agreement_name,
       s.valid_from,
       s.valid_to,
       (s.valid_to >= CURRENT_DATE)                    AS is_active,
       c.id                                            AS cluster_id,
       c.name                                          AS cluster_name,
       c.slug                                          AS cluster_slug,
       c.sort_order                                    AS cluster_sort_order,
       sp.id                                           AS specialization_id,
       sp.name                                         AS specialization_name,
       COALESCE(q.catalog_number, sp.catalog_number)   AS catalog_number,
       q.size,
       q.source_row
FROM public.winning_supplier_qualifications q
JOIN public.winning_suppliers              s  ON s.id  = q.supplier_id
JOIN public.service_specializations        sp ON sp.id = q.specialization_id
JOIN public.service_clusters               c  ON c.id  = sp.cluster_id;

GRANT SELECT ON public.v_winning_suppliers_flat TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Atomic full-replace RPC
-- ---------------------------------------------------------------------------
-- Expected p_data shape:
-- {
--   "clusters":        [{name, slug, sort_order}],
--   "specializations": [{cluster_name, name, name_normalized, catalog_number}],
--   "suppliers":       [{name, manof_number, sigma_supplier_no, sigma_agreement_no, agreement_name, valid_from, valid_to}],
--   "qualifications":  [{supplier_name, cluster_name, specialization_name, size, catalog_number, source_row}]
-- }
CREATE OR REPLACE FUNCTION public.suppliers_replace_all(p_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_clusters_count integer;
  v_specs_count    integer;
  v_suppliers_count integer;
  v_quals_count    integer;
BEGIN
  IF p_data IS NULL OR jsonb_typeof(p_data) <> 'object' THEN
    RAISE EXCEPTION 'p_data must be a JSON object';
  END IF;
  IF p_data->'qualifications' IS NULL
     OR jsonb_typeof(p_data->'qualifications') <> 'array'
     OR jsonb_array_length(p_data->'qualifications') = 0 THEN
    RAISE EXCEPTION 'refusing to wipe tables with empty qualifications array';
  END IF;

  -- Wipe in reverse FK order. Tautology WHERE clears all rows under Supabase.
  DELETE FROM public.winning_supplier_qualifications WHERE id IS NOT NULL;
  DELETE FROM public.winning_suppliers               WHERE id IS NOT NULL;
  DELETE FROM public.service_specializations         WHERE id IS NOT NULL;
  DELETE FROM public.service_clusters                WHERE id IS NOT NULL;

  -- 1. Clusters
  INSERT INTO public.service_clusters (name, slug, sort_order)
  SELECT x.name, x.slug, x.sort_order
  FROM jsonb_to_recordset(p_data->'clusters') AS x(name text, slug text, sort_order integer);
  GET DIAGNOSTICS v_clusters_count = ROW_COUNT;

  -- 2. Specializations
  INSERT INTO public.service_specializations (cluster_id, name, name_normalized, catalog_number)
  SELECT c.id, x.name, x.name_normalized, x.catalog_number
  FROM jsonb_to_recordset(p_data->'specializations')
    AS x(cluster_name text, name text, name_normalized text, catalog_number text)
  JOIN public.service_clusters c ON c.name = x.cluster_name;
  GET DIAGNOSTICS v_specs_count = ROW_COUNT;

  -- 3. Suppliers
  INSERT INTO public.winning_suppliers
         (name, manof_number, sigma_supplier_no, sigma_agreement_no, agreement_name, valid_from, valid_to)
  SELECT x.name, x.manof_number, x.sigma_supplier_no, x.sigma_agreement_no, x.agreement_name, x.valid_from, x.valid_to
  FROM jsonb_to_recordset(p_data->'suppliers')
    AS x(name text, manof_number text, sigma_supplier_no text, sigma_agreement_no text,
         agreement_name text, valid_from date, valid_to date);
  GET DIAGNOSTICS v_suppliers_count = ROW_COUNT;

  -- 4. Qualifications (lookup supplier+spec via natural keys)
  INSERT INTO public.winning_supplier_qualifications
         (supplier_id, specialization_id, size, catalog_number, source_row)
  SELECT s.id, sp.id, x.size, x.catalog_number, x.source_row
  FROM jsonb_to_recordset(p_data->'qualifications')
    AS x(supplier_name text, cluster_name text, specialization_name text,
         size text, catalog_number text, source_row integer)
  JOIN public.winning_suppliers       s  ON s.name = x.supplier_name
  JOIN public.service_clusters        c  ON c.name = x.cluster_name
  JOIN public.service_specializations sp ON sp.cluster_id = c.id AND sp.name = x.specialization_name;
  GET DIAGNOSTICS v_quals_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'clusters',        v_clusters_count,
    'specializations', v_specs_count,
    'suppliers',       v_suppliers_count,
    'qualifications',  v_quals_count
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.suppliers_replace_all(jsonb) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.suppliers_replace_all(jsonb) TO service_role;

COMMENT ON FUNCTION public.suppliers_replace_all(jsonb) IS
  'Atomic full-replace of the 4 winning-suppliers tables. Called by sync-suppliers Edge Function. service_role only.';
