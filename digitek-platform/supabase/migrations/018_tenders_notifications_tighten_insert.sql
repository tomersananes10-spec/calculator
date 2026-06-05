-- Tighten INSERT policy on tender_notifications_queue.
--
-- The previous policy (017) allowed `tender_id IS NULL`, which let any
-- authenticated user enqueue a notification with an arbitrary recipient_email —
-- turning the queue into a spam/abuse relay (HIGH severity).
--
-- New rule: client INSERTs MUST be tied to a tender the user participates in
-- or owns. System-level notifications without a tender_id can only be created
-- by the service role (which bypasses RLS) via the dispatcher / cron.

DROP POLICY IF EXISTS "Users enqueue notifications for own tenders"
  ON public.tender_notifications_queue;

CREATE POLICY "Users enqueue notifications for own tenders"
  ON public.tender_notifications_queue FOR INSERT
  TO authenticated
  WITH CHECK (
    tender_id IS NOT NULL
    AND (
      public.tender_is_participant(tender_id)
      OR public.tender_is_owner(tender_id)
    )
  );
