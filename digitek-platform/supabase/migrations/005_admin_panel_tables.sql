-- =====================================================
-- Migration 005: Admin Panel — new tables & enhanced RPC
-- =====================================================

-- 1. Add missing columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS specialization text;

-- 2. Support Tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name text,
  user_email text,
  user_phone text,
  subject text NOT NULL,
  description text,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage support tickets"
  ON public.support_tickets FOR ALL
  USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true);

-- 3. Dev Tasks
CREATE TABLE IF NOT EXISTS public.dev_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  page text,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('urgent','normal','low')),
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dev_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage dev tasks"
  ON public.dev_tasks FOR ALL
  USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true);

-- 4. App Errors
CREATE TABLE IF NOT EXISTS public.app_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type text NOT NULL DEFAULT 'error',
  message text NOT NULL,
  stack text,
  context jsonb,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage app errors"
  ON public.app_errors FOR ALL
  USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true);

CREATE POLICY "Any user can insert app errors"
  ON public.app_errors FOR INSERT
  WITH CHECK (true);

-- 5. Data Quality Checks
CREATE TABLE IF NOT EXISTS public.data_quality_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_name text NOT NULL,
  layer text NOT NULL,
  status text NOT NULL CHECK (status IN ('pass','fail','warn','error')),
  scope text,
  target_user_id uuid,
  expected jsonb,
  actual jsonb,
  message text,
  duration_ms integer,
  ran_at timestamptz NOT NULL DEFAULT now(),
  batch_id uuid NOT NULL DEFAULT gen_random_uuid()
);

ALTER TABLE public.data_quality_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage data quality checks"
  ON public.data_quality_checks FOR ALL
  USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true);

-- 6. Enhanced admin_get_all_profiles RPC (drop old signature first)
DROP FUNCTION IF EXISTS public.admin_get_all_profiles();
CREATE OR REPLACE FUNCTION public.admin_get_all_profiles()
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  avatar_url text,
  phone text,
  company text,
  company_id text,
  address text,
  specialization text,
  created_at timestamptz,
  is_admin boolean,
  last_sign_in_at timestamptz,
  auth_provider text,
  calculation_count bigint,
  brief_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT (SELECT p.is_admin FROM public.profiles p WHERE p.id = auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    u.email::text,
    p.avatar_url,
    p.phone,
    p.company,
    p.company_id,
    p.address,
    p.specialization,
    p.created_at,
    p.is_admin,
    u.last_sign_in_at,
    COALESCE(
      (u.raw_app_meta_data->>'provider')::text,
      'email'
    ) AS auth_provider,
    COALESCE(calc.cnt, 0) AS calculation_count,
    COALESCE(brief.cnt, 0) AS brief_count
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  LEFT JOIN (
    SELECT c.owner_id, COUNT(*) AS cnt
    FROM public.calculations c
    GROUP BY c.owner_id
  ) calc ON calc.owner_id = p.id
  LEFT JOIN (
    SELECT b.user_id, COUNT(*) AS cnt
    FROM public.briefs b
    GROUP BY b.user_id
  ) brief ON brief.user_id = p.id
  ORDER BY p.created_at DESC;
END;
$$;
