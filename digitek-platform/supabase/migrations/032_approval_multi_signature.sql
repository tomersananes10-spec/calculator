-- 032 — תמיכה ב-multi-signer approval flow (AND logic)
--
-- עד היום, tender_approval_requests תמך בהחלטה יחידה (signer אחד).
-- בקשות ועדה (committee_outbound/winner) ובקשות חתימה (contract_signature)
-- דורשות לעיתים כמה חותמים יחד — והאישור צריך להיות AND (כל אחד חייב לחתום).
--
-- מנגנון:
-- 1. טבלה חדשה tender_approval_signatures — שורה לכל חותם נדרש לבקשה.
-- 2. כל חותם מקבל החלטה משלו (approved/rejected/returned).
-- 3. helper _tender_recompute_approval_status מסכם:
--    - אם מישהו דחה → parent.status='rejected'
--    - אם מישהו החזיר → parent.status='returned'
--    - אם כולם אישרו → parent.status='approved'
--    - אחרת → parent נשאר 'pending' (ממתינים לעוד חותמים)
-- 4. עדכון 2 ה-RPCs (decide_by_token + decide_as_recipient):
--    אם קיימות שורות signatures לבקשה — משתמש ב-flow החדש;
--    אחרת — fallback לבדיוק ההתנהגות הקודמת (backward compatible).

CREATE TABLE IF NOT EXISTS public.tender_approval_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.tender_approval_requests(id) ON DELETE CASCADE,
  signer_id uuid REFERENCES public.tender_signers(id) ON DELETE SET NULL,
  signer_email text NOT NULL,
  signer_role text NOT NULL,
  signer_display_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'returned')),
  decision_comments text,
  signature_name text,
  signature_image_path text,
  attachment_paths text[],
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, signer_email)
);

CREATE INDEX IF NOT EXISTS tender_approval_signatures_request_idx
  ON public.tender_approval_signatures(request_id);
CREATE INDEX IF NOT EXISTS tender_approval_signatures_pending_idx
  ON public.tender_approval_signatures(request_id) WHERE status = 'pending';

ALTER TABLE public.tender_approval_signatures ENABLE ROW LEVEL SECURITY;

-- בעלי ההליך ואדמינים יכולים לקרוא; אדמינים יכולים לעדכן ישירות.
-- העדכונים הרגילים עוברים דרך SECURITY DEFINER RPCs (decide_*), שכותבים בשם המערכת.
CREATE POLICY "Owners + admins read signatures"
  ON public.tender_approval_signatures FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tender_approval_requests r
      JOIN public.tenders t ON t.id = r.tender_id
      WHERE r.id = request_id
        AND (t.owner_id = auth.uid()
             OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true)
    )
  );

CREATE POLICY "Owners create signatures"
  ON public.tender_approval_signatures FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tender_approval_requests r
      JOIN public.tenders t ON t.id = r.tender_id
      WHERE r.id = request_id AND t.owner_id = auth.uid()
    )
  );

-- ───────── helper: aggregate status ─────────
-- מחזיר 'approved' / 'rejected' / 'returned' / 'pending' לפי כלל ה-AND.
-- אם אין שורות → NULL (אומר: legacy single-signer flow, decide RPC יחליט בעצמו).
CREATE OR REPLACE FUNCTION public._tender_aggregate_approval_status(
  p_request_id uuid
) RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total int;
  v_approved int;
  v_rejected int;
  v_returned int;
BEGIN
  SELECT
    count(*),
    count(*) FILTER (WHERE status = 'approved'),
    count(*) FILTER (WHERE status = 'rejected'),
    count(*) FILTER (WHERE status = 'returned')
  INTO v_total, v_approved, v_rejected, v_returned
  FROM public.tender_approval_signatures
  WHERE request_id = p_request_id;

  IF v_total = 0 THEN
    RETURN NULL;  -- legacy mode
  END IF;
  IF v_rejected > 0 THEN
    RETURN 'rejected';
  END IF;
  IF v_returned > 0 THEN
    RETURN 'returned';
  END IF;
  IF v_approved = v_total THEN
    RETURN 'approved';
  END IF;
  RETURN 'pending';
END;
$$;

REVOKE EXECUTE ON FUNCTION public._tender_aggregate_approval_status(uuid)
  FROM PUBLIC, anon, authenticated;

-- ───────── helper: record a signer's decision ─────────
-- משמש מה-RPCs (by_token, as_recipient) כדי לרשום החלטה בודדת
-- ולעדכן את הסטטוס הכולל של ה-parent.
-- מחזיר את הסטטוס הסופי של ה-parent (approved/rejected/returned/pending).
CREATE OR REPLACE FUNCTION public._tender_record_signature_decision(
  p_request_id uuid,
  p_signer_email text,
  p_decision text,
  p_comments text,
  p_signature_name text,
  p_signature_image_path text,
  p_attachment_paths text[]
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(trim(p_signer_email));
  v_aggregate text;
  v_updated_count int;
BEGIN
  IF p_decision NOT IN ('approved', 'rejected', 'returned') THEN
    RAISE EXCEPTION 'Invalid decision: %', p_decision;
  END IF;

  -- עדכון השורה — רק אם עדיין pending. החותם לא יכול לשנות החלטה שכבר נחתמה.
  UPDATE public.tender_approval_signatures
  SET status = p_decision,
      decision_comments = p_comments,
      signature_name = p_signature_name,
      signature_image_path = p_signature_image_path,
      attachment_paths = p_attachment_paths,
      decided_at = now()
  WHERE request_id = p_request_id
    AND lower(trim(signer_email)) = v_email
    AND status = 'pending';

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  IF v_updated_count = 0 THEN
    RAISE EXCEPTION 'No pending signature row for % on request %. Either already signed, not authorized, or signer not assigned.', v_email, p_request_id;
  END IF;

  v_aggregate := public._tender_aggregate_approval_status(p_request_id);
  RETURN v_aggregate;
END;
$$;

REVOKE EXECUTE ON FUNCTION public._tender_record_signature_decision(uuid, text, text, text, text, text, text[])
  FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE public.tender_approval_signatures IS
  'שורת חתימה פר-חותם נדרש לבקשת אישור. AND logic: כל השורות חייבות approved כדי שהבקשה תאושר.';
COMMENT ON FUNCTION public._tender_aggregate_approval_status IS
  'מחשב סטטוס מצרפי של בקשה לפי שורות החתימה. NULL = אין חותמים → legacy single-signer.';
COMMENT ON FUNCTION public._tender_record_signature_decision IS
  'רושם החלטת חותם ומחזיר את הסטטוס המצרפי של הבקשה. נקרא מ-decide_* RPCs.';
