-- Add 'processing' state so the dispatcher can claim rows atomically
-- before attempting SMTP send (which can take seconds and fail).

ALTER TABLE public.tender_notifications_queue
  DROP CONSTRAINT IF EXISTS tender_notifications_queue_status_check;

ALTER TABLE public.tender_notifications_queue
  ADD CONSTRAINT tender_notifications_queue_status_check
  CHECK (status = ANY (ARRAY['pending', 'processing', 'sent', 'failed', 'cancelled']));
