-- Allow external email-only recipients in the notifications queue.
-- Until now user_id was NOT NULL — that blocked sending to addresses that
-- don't belong to an auth.users row (committee members, ministry officers, etc.).

ALTER TABLE public.tender_notifications_queue
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.tender_notifications_queue
  ADD COLUMN IF NOT EXISTS recipient_email text;

ALTER TABLE public.tender_notifications_queue
  ADD COLUMN IF NOT EXISTS subject text;

-- Either an internal user OR an external email must be set.
ALTER TABLE public.tender_notifications_queue
  DROP CONSTRAINT IF EXISTS tender_notif_recipient_chk;
ALTER TABLE public.tender_notifications_queue
  ADD CONSTRAINT tender_notif_recipient_chk
  CHECK (user_id IS NOT NULL OR recipient_email IS NOT NULL);

CREATE INDEX IF NOT EXISTS tender_notif_email_idx
  ON public.tender_notifications_queue(recipient_email)
  WHERE recipient_email IS NOT NULL;

-- Keep existing "Users see own notifications" policy intact (matches on user_id);
-- external-email rows are admin-visible only, which is the right default.
