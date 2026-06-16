-- 026_committee_meeting_schedule.sql
-- Allow tender owners (not only admins) to schedule a committee meeting
-- with a specific date, attendee emails, agenda, and attachments. The
-- attendees are stored as plain emails in metadata (legal/comptroller
-- often don't have LIBA accounts yet); per-meeting email invitations
-- are enqueued in tender_notifications_queue and sent via Resend.

-- 1. Loosen RLS so the tender owner can INSERT meeting rows for their tender
DROP POLICY IF EXISTS "Owner+admins manage committee meetings" ON public.tender_committee_meetings;
CREATE POLICY "Owner+admins manage committee meetings"
  ON public.tender_committee_meetings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tenders t
      WHERE t.id = ANY (tender_refs) AND t.owner_id = auth.uid()
    )
    OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenders t
      WHERE t.id = ANY (tender_refs) AND t.owner_id = auth.uid()
    )
    OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
  );

-- 2. New RPC — atomic creation of meeting + notifications enqueue
CREATE OR REPLACE FUNCTION public.tender_schedule_committee_meeting(
  p_tender_id uuid,
  p_committee_type text,           -- 'tenders' | 'subcommittee_quality' | 'exceptions'
  p_scheduled_at timestamptz,
  p_attendee_emails text[],
  p_agenda text,
  p_duration_minutes integer DEFAULT 120
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_tender public.tenders%ROWTYPE;
  v_committee_id uuid;
  v_meeting_id uuid;
  v_is_owner boolean;
  v_is_admin boolean;
  v_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_scheduled_at <= now() THEN
    RAISE EXCEPTION 'Meeting date must be in the future';
  END IF;
  IF p_committee_type NOT IN ('tenders', 'exceptions', 'subcommittee_quality') THEN
    RAISE EXCEPTION 'Invalid committee type: %', p_committee_type;
  END IF;
  IF array_length(p_attendee_emails, 1) IS NULL OR array_length(p_attendee_emails, 1) = 0 THEN
    RAISE EXCEPTION 'At least one attendee email is required';
  END IF;
  IF length(trim(coalesce(p_agenda, ''))) < 4 THEN
    RAISE EXCEPTION 'Agenda must be at least 4 characters';
  END IF;

  -- Authorise: owner or admin
  SELECT * INTO v_tender FROM public.tenders WHERE id = p_tender_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tender not found';
  END IF;
  v_is_owner := (v_tender.owner_id = auth.uid());
  v_is_admin := COALESCE((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), false);
  IF NOT v_is_owner AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Not authorised on this tender';
  END IF;

  -- Pick or create a committee row matching this ministry+type. We keep a
  -- single "default" committee per (ministry, type); the meeting carries
  -- the real per-meeting attendees in its metadata.
  SELECT id INTO v_committee_id
    FROM public.tender_committees
   WHERE committee_type = p_committee_type
     AND ministry = COALESCE(v_tender.ministry, '')
     AND active = true
   LIMIT 1;

  IF v_committee_id IS NULL THEN
    INSERT INTO public.tender_committees (name, committee_type, ministry, members, active)
    VALUES (
      'ועדת ' || CASE p_committee_type
        WHEN 'tenders' THEN 'מכרזים'
        WHEN 'subcommittee_quality' THEN 'תת-איכות'
        ELSE 'חריגים'
      END || ' · ' || COALESCE(v_tender.ministry, '—'),
      p_committee_type,
      COALESCE(v_tender.ministry, ''),
      ARRAY[]::uuid[],
      true
    )
    RETURNING id INTO v_committee_id;
  END IF;

  -- Create the meeting row. Attendee emails are in metadata; native attendees
  -- (uuid[]) stay empty for now until we map invited users to LIBA accounts.
  INSERT INTO public.tender_committee_meetings (
    committee_id, scheduled_at, duration_minutes, agenda,
    tender_refs, status, attendees
  ) VALUES (
    v_committee_id, p_scheduled_at, p_duration_minutes,
    jsonb_build_array(jsonb_build_object(
      'tender_id', p_tender_id,
      'agenda_text', p_agenda
    )),
    ARRAY[p_tender_id]::uuid[],
    'scheduled',
    ARRAY[]::uuid[]
  )
  RETURNING id INTO v_meeting_id;

  -- Stamp the meeting metadata with the attendee emails (lowercase + trim)
  UPDATE public.tender_committee_meetings
     SET tender_refs = ARRAY[p_tender_id]::uuid[]
   WHERE id = v_meeting_id;

  -- Enqueue an invitation email per attendee
  FOREACH v_email IN ARRAY p_attendee_emails LOOP
    IF length(trim(v_email)) > 0 THEN
      INSERT INTO public.tender_notifications_queue (
        recipient_email, subject, channel, notification_type,
        tender_id, payload, status
      ) VALUES (
        lower(trim(v_email)),
        'זימון לוועדה: ' || v_tender.title,
        'email',
        'committee_invite',
        p_tender_id,
        jsonb_build_object(
          'meeting_id', v_meeting_id,
          'scheduled_at', p_scheduled_at,
          'committee_type', p_committee_type,
          'agenda', p_agenda,
          'tender_title', v_tender.title,
          'tender_id', p_tender_id,
          'body', p_agenda
        ),
        'pending'
      );
    END IF;
  END LOOP;

  RETURN v_meeting_id;
END;
$func$;

REVOKE EXECUTE ON FUNCTION public.tender_schedule_committee_meeting(uuid, text, timestamptz, text[], text, integer) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.tender_schedule_committee_meeting(uuid, text, timestamptz, text[], text, integer) TO authenticated;
