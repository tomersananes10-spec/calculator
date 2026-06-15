-- =====================================================
-- Migration 007: Tenders CRM — Committees & Protocols (M03)
-- =====================================================
-- 3 entities: committees, committee_meetings, protocols

-- =====================================================
-- 1. COMMITTEES — committee definitions
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tender_committees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  committee_type text NOT NULL CHECK (committee_type IN ('tenders', 'exceptions', 'subcommittee_quality')),
  ministry text NOT NULL,
  members uuid[] NOT NULL DEFAULT '{}',
  meeting_cadence_days integer NOT NULL DEFAULT 14,
  active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tender_committees_type_idx ON public.tender_committees(committee_type);
CREATE INDEX IF NOT EXISTS tender_committees_ministry_idx ON public.tender_committees(ministry);

ALTER TABLE public.tender_committees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users read committees"
  ON public.tender_committees FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage committees"
  ON public.tender_committees FOR ALL
  USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true);

CREATE TRIGGER tender_committees_touch_updated BEFORE UPDATE ON public.tender_committees
  FOR EACH ROW EXECUTE FUNCTION public.tender_touch_updated_at();

-- =====================================================
-- 2. COMMITTEE_MEETINGS — scheduled sessions
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tender_committee_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id uuid NOT NULL REFERENCES public.tender_committees(id) ON DELETE RESTRICT,
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 120,
  agenda jsonb NOT NULL DEFAULT '[]'::jsonb,
  tender_refs uuid[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'postponed')),
  decision_summary text,
  attendees uuid[] NOT NULL DEFAULT '{}',
  protocol_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tender_committee_meetings_committee_idx ON public.tender_committee_meetings(committee_id);
CREATE INDEX IF NOT EXISTS tender_committee_meetings_scheduled_idx ON public.tender_committee_meetings(scheduled_at);

ALTER TABLE public.tender_committee_meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members + admins read committee meetings"
  ON public.tender_committee_meetings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tender_committees c
      WHERE c.id = committee_id AND auth.uid() = ANY (c.members)
    )
    OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
    OR EXISTS (
      SELECT 1 FROM public.tenders t
      WHERE t.id = ANY (tender_refs) AND t.owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins manage committee meetings"
  ON public.tender_committee_meetings FOR ALL
  USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true);

CREATE TRIGGER tender_committee_meetings_touch_updated BEFORE UPDATE ON public.tender_committee_meetings
  FOR EACH ROW EXECUTE FUNCTION public.tender_touch_updated_at();

-- =====================================================
-- 3. PROTOCOLS — signed committee protocols
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tender_protocols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id uuid NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
  committee_meeting_id uuid REFERENCES public.tender_committee_meetings(id) ON DELETE SET NULL,
  protocol_type text NOT NULL CHECK (protocol_type IN ('outbound_request', 'winner_approval', 'exceptions', 'subcommittee_scoring')),
  decision text NOT NULL CHECK (decision IN ('approved', 'rejected', 'returned_for_correction', 'completion_required')),
  rationale text,
  votes jsonb NOT NULL DEFAULT '[]'::jsonb,
  dissents jsonb NOT NULL DEFAULT '[]'::jsonb,
  signed_at timestamptz,
  signed_by uuid[] NOT NULL DEFAULT '{}',
  file_ref text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tender_protocols_tender_idx ON public.tender_protocols(tender_id);
CREATE INDEX IF NOT EXISTS tender_protocols_meeting_idx ON public.tender_protocols(committee_meeting_id);

ALTER TABLE public.tender_protocols ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Protocols visible to tender owner + admins"
  ON public.tender_protocols FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.tenders t WHERE t.id = tender_id AND t.owner_id = auth.uid())
    OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
  );

CREATE TRIGGER tender_protocols_touch_updated BEFORE UPDATE ON public.tender_protocols
  FOR EACH ROW EXECUTE FUNCTION public.tender_touch_updated_at();

-- Back-link meeting → protocol after both tables exist
ALTER TABLE public.tender_committee_meetings
  ADD CONSTRAINT tender_committee_meetings_protocol_fk
  FOREIGN KEY (protocol_id) REFERENCES public.tender_protocols(id) ON DELETE SET NULL;
