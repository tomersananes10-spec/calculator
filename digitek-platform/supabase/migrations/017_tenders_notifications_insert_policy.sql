-- Allow authenticated users to enqueue notifications for tenders they participate in.
-- The previous migration only had a SELECT policy, so client INSERTs were silently denied.

CREATE POLICY "Users enqueue notifications for own tenders"
  ON public.tender_notifications_queue FOR INSERT
  TO authenticated
  WITH CHECK (
    tender_id IS NULL
    OR public.tender_is_participant(tender_id)
    OR public.tender_is_owner(tender_id)
  );

-- Service role bypasses RLS automatically, so the cron dispatcher (service-role)
-- can still write status updates and enqueue system notifications.
