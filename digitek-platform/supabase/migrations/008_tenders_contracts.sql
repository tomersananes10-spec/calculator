-- =====================================================
-- Migration 008: Tenders CRM — Contracts, Guarantees, Insurance, POs (M07, M08)
-- =====================================================
-- 4 entities: contracts, guarantees, insurance, purchase_orders

-- =====================================================
-- 1. CONTRACT_TEMPLATES — auto-selected by Gateway G9
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tender_contract_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  -- Selection criteria (G9):
  min_amount numeric(14,2),
  max_amount numeric(14,2),
  requires_guarantee boolean NOT NULL DEFAULT false,
  requires_insurance boolean NOT NULL DEFAULT false,
  file_ref text,
  version integer NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tender_contract_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users read templates"
  ON public.tender_contract_templates FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage templates"
  ON public.tender_contract_templates FOR ALL
  USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true);

CREATE TRIGGER tender_contract_templates_touch_updated BEFORE UPDATE ON public.tender_contract_templates
  FOR EACH ROW EXECUTE FUNCTION public.tender_touch_updated_at();

-- =====================================================
-- 2. CONTRACTS — signed agreements
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tender_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id uuid NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES public.tender_vendors(id) ON DELETE RESTRICT,
  template_id uuid REFERENCES public.tender_contract_templates(id) ON DELETE SET NULL,
  contract_number text UNIQUE,
  total_amount numeric(14,2) NOT NULL CHECK (total_amount >= 0),
  effective_date date,
  expiry_date date,
  guarantee_required boolean NOT NULL DEFAULT false,
  insurance_required boolean NOT NULL DEFAULT false,
  signature_status text NOT NULL DEFAULT 'draft' CHECK (signature_status IN (
    'draft', 'sent_to_vendor', 'vendor_signed', 'pending_internal_review',
    'pending_signatory', 'fully_signed', 'cancelled'
  )),
  vendor_signed_at timestamptz,
  internal_signed_at timestamptz,
  file_ref text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tender_contracts_tender_idx ON public.tender_contracts(tender_id);
CREATE INDEX IF NOT EXISTS tender_contracts_vendor_idx ON public.tender_contracts(vendor_id);
CREATE INDEX IF NOT EXISTS tender_contracts_status_idx ON public.tender_contracts(signature_status);

ALTER TABLE public.tender_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contracts visible to tender owner + admins"
  ON public.tender_contracts FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.tenders t WHERE t.id = tender_id AND t.owner_id = auth.uid())
    OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
    OR EXISTS (
      SELECT 1 FROM public.tender_personas tp
      WHERE tp.tender_id = tender_id
        AND tp.user_id = auth.uid()
        AND tp.persona_role IN ('signatory', 'legal_professional', 'procurement_team')
        AND tp.active = true
    )
  );

CREATE TRIGGER tender_contracts_touch_updated BEFORE UPDATE ON public.tender_contracts
  FOR EACH ROW EXECUTE FUNCTION public.tender_touch_updated_at();

-- =====================================================
-- 3. GUARANTEES — bank/financial guarantees
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tender_guarantees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.tender_contracts(id) ON DELETE CASCADE,
  guarantee_number text,
  guarantee_type text NOT NULL DEFAULT 'performance'
    CHECK (guarantee_type IN ('performance', 'bid', 'advance_payment', 'warranty')),
  amount numeric(14,2) NOT NULL CHECK (amount >= 0),
  issuer text NOT NULL,
  valid_from date NOT NULL,
  valid_to date NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'verified', 'expired', 'released', 'rejected')),
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at timestamptz,
  file_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tender_guarantees_contract_idx ON public.tender_guarantees(contract_id);
CREATE INDEX IF NOT EXISTS tender_guarantees_validto_idx ON public.tender_guarantees(valid_to);

ALTER TABLE public.tender_guarantees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guarantees visible via contract"
  ON public.tender_guarantees FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tender_contracts c
      JOIN public.tenders t ON t.id = c.tender_id
      WHERE c.id = contract_id AND (t.owner_id = auth.uid()
        OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true)
    )
  );

CREATE TRIGGER tender_guarantees_touch_updated BEFORE UPDATE ON public.tender_guarantees
  FOR EACH ROW EXECUTE FUNCTION public.tender_touch_updated_at();

-- =====================================================
-- 4. INSURANCE — insurance policies
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tender_insurance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.tender_contracts(id) ON DELETE CASCADE,
  policy_number text,
  coverage jsonb NOT NULL DEFAULT '{}'::jsonb,
  insurer text NOT NULL,
  valid_from date NOT NULL,
  valid_to date NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'verified', 'expired', 'rejected')),
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at timestamptz,
  file_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tender_insurance_contract_idx ON public.tender_insurance(contract_id);

ALTER TABLE public.tender_insurance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Insurance visible via contract"
  ON public.tender_insurance FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tender_contracts c
      JOIN public.tenders t ON t.id = c.tender_id
      WHERE c.id = contract_id AND (t.owner_id = auth.uid()
        OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true)
    )
  );

CREATE TRIGGER tender_insurance_touch_updated BEFORE UPDATE ON public.tender_insurance
  FOR EACH ROW EXECUTE FUNCTION public.tender_touch_updated_at();

-- =====================================================
-- 5. PURCHASE_ORDERS — ERP-linked POs
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tender_purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id uuid NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES public.tender_contracts(id) ON DELETE RESTRICT,
  erp_ref text,
  po_number text UNIQUE,
  total_amount numeric(14,2) NOT NULL CHECK (total_amount >= 0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'submitted_to_erp', 'approved_in_erp', 'sent_to_vendor', 'acknowledged', 'cancelled'
  )),
  issued_at timestamptz,
  sent_to_vendor_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tender_pos_tender_idx ON public.tender_purchase_orders(tender_id);
CREATE INDEX IF NOT EXISTS tender_pos_contract_idx ON public.tender_purchase_orders(contract_id);

ALTER TABLE public.tender_purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "POs visible to tender owner + admins"
  ON public.tender_purchase_orders FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.tenders t WHERE t.id = tender_id AND t.owner_id = auth.uid())
    OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
  );

CREATE TRIGGER tender_pos_touch_updated BEFORE UPDATE ON public.tender_purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.tender_touch_updated_at();
