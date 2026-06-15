-- Tighten INSERT policy: external email recipients are a spam vector if any
-- tender participant can enqueue them. Restrict free-form recipient_email
-- writes to the tender OWNER (or admin). Participants without owner role
-- can still enqueue internal user_id notifications, just not arbitrary emails.

DROP POLICY IF EXISTS "Users enqueue notifications for own tenders"
  ON public.tender_notifications_queue;

CREATE POLICY "Owner enqueues external email notifications"
  ON public.tender_notifications_queue FOR INSERT
  TO authenticated
  WITH CHECK (
    (tender_id IS NULL
      AND (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
    )
    OR
    (recipient_email IS NOT NULL
      AND tender_id IS NOT NULL
      AND public.tender_is_owner(tender_id)
    )
    OR
    (recipient_email IS NULL
      AND user_id IS NOT NULL
      AND tender_id IS NOT NULL
      AND (public.tender_is_owner(tender_id) OR public.tender_is_participant(tender_id))
    )
  );
