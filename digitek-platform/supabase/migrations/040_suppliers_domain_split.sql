-- Split the winning-suppliers catalog into two domains:
--   'tech'    — נספח ד2, מעולמות הטק      (existing data, kept as-is)
--   'digital' — נספח ד1, מעולמות הדיגיטל  (new, loaded via sync-suppliers)
-- A supplier that won in both annexes gets one row per domain (each annex has
-- its own sigma agreement), so suppliers carry the domain too.

-- ---------------------------------------------------------------------------
-- 1. domain column on clusters + suppliers (existing rows default to 'tech')
-- ---------------------------------------------------------------------------
ALTER TABLE public.service_clusters
  ADD COLUMN IF NOT EXISTS domain text NOT NULL DEFAULT 'tech'
  CHECK (domain IN ('tech', 'digital'));

ALTER TABLE public.winning_suppliers
  ADD COLUMN IF NOT EXISTS domain text NOT NULL DEFAULT 'tech'
  CHECK (domain IN ('tech', 'digital'));

CREATE INDEX IF NOT EXISTS service_clusters_domain_idx  ON public.service_clusters (domain);
CREATE INDEX IF NOT EXISTS winning_suppliers_domain_idx ON public.winning_suppliers (domain);

-- Supplier uniqueness is per domain (annex D1 supplier "דלויט" is a different
-- agreement than annex D2 "דלויט").
ALTER TABLE public.winning_suppliers
  DROP CONSTRAINT IF EXISTS winning_suppliers_name_sigma_agreement_no_key;
ALTER TABLE public.winning_suppliers
  ADD CONSTRAINT winning_suppliers_domain_name_key UNIQUE (domain, name);

-- ---------------------------------------------------------------------------
-- 2. Annex D1 introduces a third size value: "ל.ר" (לא רלוונטי)
-- ---------------------------------------------------------------------------
ALTER TABLE public.winning_supplier_qualifications
  DROP CONSTRAINT IF EXISTS winning_supplier_qualifications_size_check;
ALTER TABLE public.winning_supplier_qualifications
  ADD CONSTRAINT winning_supplier_qualifications_size_check
  CHECK (size IN ('גדול', 'קטן', 'ל.ר') OR size IS NULL);

-- ---------------------------------------------------------------------------
-- 3. Flat view — expose the domain (new column appended at the end)
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
       q.source_row,
       c.domain                                        AS domain
FROM public.winning_supplier_qualifications q
JOIN public.winning_suppliers              s  ON s.id  = q.supplier_id
JOIN public.service_specializations        sp ON sp.id = q.specialization_id
JOIN public.service_clusters               c  ON c.id  = sp.cluster_id;

GRANT SELECT ON public.v_winning_suppliers_flat TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Replace RPC — per-domain atomic replace (loading digital must not wipe tech)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.suppliers_replace_all(jsonb);

CREATE OR REPLACE FUNCTION public.suppliers_replace_all(p_data jsonb, p_domain text DEFAULT 'tech')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_clusters_count  integer;
  v_specs_count     integer;
  v_suppliers_count integer;
  v_quals_count     integer;
BEGIN
  IF p_domain IS NULL OR p_domain NOT IN ('tech', 'digital') THEN
    RAISE EXCEPTION 'p_domain must be tech or digital';
  END IF;
  IF p_data IS NULL OR jsonb_typeof(p_data) <> 'object' THEN
    RAISE EXCEPTION 'p_data must be a JSON object';
  END IF;
  IF p_data->'qualifications' IS NULL
     OR jsonb_typeof(p_data->'qualifications') <> 'array'
     OR jsonb_array_length(p_data->'qualifications') = 0 THEN
    RAISE EXCEPTION 'refusing to wipe tables with empty qualifications array';
  END IF;

  -- Wipe only this domain, in reverse FK order.
  DELETE FROM public.winning_supplier_qualifications q
  USING public.winning_suppliers s
  WHERE q.supplier_id = s.id AND s.domain = p_domain;

  DELETE FROM public.winning_suppliers WHERE domain = p_domain;

  DELETE FROM public.service_specializations sp
  USING public.service_clusters c
  WHERE sp.cluster_id = c.id AND c.domain = p_domain;

  DELETE FROM public.service_clusters WHERE domain = p_domain;

  -- 1. Clusters
  INSERT INTO public.service_clusters (name, slug, sort_order, domain)
  SELECT x.name, x.slug, x.sort_order, p_domain
  FROM jsonb_to_recordset(p_data->'clusters') AS x(name text, slug text, sort_order integer);
  GET DIAGNOSTICS v_clusters_count = ROW_COUNT;

  -- 2. Specializations
  INSERT INTO public.service_specializations (cluster_id, name, name_normalized, catalog_number)
  SELECT c.id, x.name, x.name_normalized, x.catalog_number
  FROM jsonb_to_recordset(p_data->'specializations')
    AS x(cluster_name text, name text, name_normalized text, catalog_number text)
  JOIN public.service_clusters c ON c.name = x.cluster_name AND c.domain = p_domain;
  GET DIAGNOSTICS v_specs_count = ROW_COUNT;

  -- 3. Suppliers
  INSERT INTO public.winning_suppliers
         (name, manof_number, sigma_supplier_no, sigma_agreement_no, agreement_name, valid_from, valid_to, domain)
  SELECT x.name, x.manof_number, x.sigma_supplier_no, x.sigma_agreement_no, x.agreement_name, x.valid_from, x.valid_to, p_domain
  FROM jsonb_to_recordset(p_data->'suppliers')
    AS x(name text, manof_number text, sigma_supplier_no text, sigma_agreement_no text,
         agreement_name text, valid_from date, valid_to date);
  GET DIAGNOSTICS v_suppliers_count = ROW_COUNT;

  -- 4. Qualifications (lookup supplier+spec via natural keys, within the domain)
  INSERT INTO public.winning_supplier_qualifications
         (supplier_id, specialization_id, size, catalog_number, source_row)
  SELECT s.id, sp.id, x.size, x.catalog_number, x.source_row
  FROM jsonb_to_recordset(p_data->'qualifications')
    AS x(supplier_name text, cluster_name text, specialization_name text,
         size text, catalog_number text, source_row integer)
  JOIN public.winning_suppliers       s  ON s.name = x.supplier_name AND s.domain = p_domain
  JOIN public.service_clusters        c  ON c.name = x.cluster_name  AND c.domain = p_domain
  JOIN public.service_specializations sp ON sp.cluster_id = c.id AND sp.name = x.specialization_name;
  GET DIAGNOSTICS v_quals_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'domain',          p_domain,
    'clusters',        v_clusters_count,
    'specializations', v_specs_count,
    'suppliers',       v_suppliers_count,
    'qualifications',  v_quals_count
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.suppliers_replace_all(jsonb, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.suppliers_replace_all(jsonb, text) TO service_role;

COMMENT ON FUNCTION public.suppliers_replace_all(jsonb, text) IS
  'Atomic per-domain replace of the winning-suppliers tables (tech = annex D2, digital = annex D1). Called by sync-suppliers Edge Function. service_role only.';
