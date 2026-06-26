-- Knowledge Hub (OneStopShop) — מסעות מודרכים פר משתמש.
-- כל "מסע" נוצר מטקסט חופשי שהמשתמש הקליד במסך החיפוש; Gemini מחזיר רשימת
-- שלבים (1-10) המופיעים בטבלת journey_steps. כל שלב מצביע למודול ב-LIBA
-- (brief/takam/aiml/tenders/roved5/suppliers) ומכיל prefill_params לפתיחת
-- אותו מודול עם הקשר מועבר.

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.journeys (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wish_text   text NOT NULL,
  ai_summary  text,
  ai_tags     text[] NOT NULL DEFAULT '{}',
  status      text NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','completed','archived')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS journeys_user_idx       ON public.journeys (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS journeys_user_status_idx ON public.journeys (user_id, status);

CREATE TABLE IF NOT EXISTS public.journey_steps (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id           uuid NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,
  order_index          integer NOT NULL,
  module_key           text NOT NULL
                         CHECK (module_key IN ('brief','takam','aiml','tenders','roved5','suppliers')),
  title                text NOT NULL,
  description          text,
  prefill_params       jsonb NOT NULL DEFAULT '{}'::jsonb,
  status               text NOT NULL DEFAULT 'active'
                         CHECK (status IN ('locked','active','done','skipped')),
  linked_entity_table  text,
  linked_entity_id     uuid,
  completed_at         timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (journey_id, order_index)
);

CREATE INDEX IF NOT EXISTS journey_steps_journey_idx ON public.journey_steps (journey_id, order_index);
CREATE INDEX IF NOT EXISTS journey_steps_linked_idx  ON public.journey_steps (linked_entity_table, linked_entity_id)
  WHERE linked_entity_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. updated_at trigger (reuse standard pattern)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._knowledge_hub_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS journeys_touch_updated_at ON public.journeys;
CREATE TRIGGER journeys_touch_updated_at
  BEFORE UPDATE ON public.journeys
  FOR EACH ROW EXECUTE FUNCTION public._knowledge_hub_touch_updated_at();

DROP TRIGGER IF EXISTS journey_steps_touch_updated_at ON public.journey_steps;
CREATE TRIGGER journey_steps_touch_updated_at
  BEFORE UPDATE ON public.journey_steps
  FOR EACH ROW EXECUTE FUNCTION public._knowledge_hub_touch_updated_at();

-- ---------------------------------------------------------------------------
-- 3. RLS — per-user only
-- ---------------------------------------------------------------------------

ALTER TABLE public.journeys      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS journeys_owner_all ON public.journeys;
CREATE POLICY journeys_owner_all ON public.journeys
  FOR ALL TO authenticated
  USING      (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS journey_steps_owner_select ON public.journey_steps;
CREATE POLICY journey_steps_owner_select ON public.journey_steps
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.journeys j
    WHERE j.id = journey_steps.journey_id AND j.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS journey_steps_owner_insert ON public.journey_steps;
CREATE POLICY journey_steps_owner_insert ON public.journey_steps
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.journeys j
    WHERE j.id = journey_steps.journey_id AND j.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS journey_steps_owner_update ON public.journey_steps;
CREATE POLICY journey_steps_owner_update ON public.journey_steps
  FOR UPDATE TO authenticated
  USING      (EXISTS (SELECT 1 FROM public.journeys j WHERE j.id = journey_steps.journey_id AND j.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.journeys j WHERE j.id = journey_steps.journey_id AND j.user_id = auth.uid()));

DROP POLICY IF EXISTS journey_steps_owner_delete ON public.journey_steps;
CREATE POLICY journey_steps_owner_delete ON public.journey_steps
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.journeys j
    WHERE j.id = journey_steps.journey_id AND j.user_id = auth.uid()
  ));

-- ---------------------------------------------------------------------------
-- 4. Auto-complete journey when all steps done
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._knowledge_hub_check_journey_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remaining integer;
BEGIN
  IF NEW.status <> 'done' OR OLD.status = 'done' THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_remaining
  FROM public.journey_steps
  WHERE journey_id = NEW.journey_id
    AND status NOT IN ('done','skipped');

  IF v_remaining = 0 THEN
    UPDATE public.journeys
       SET status = 'completed'
     WHERE id = NEW.journey_id AND status = 'active';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS journey_steps_check_completion ON public.journey_steps;
CREATE TRIGGER journey_steps_check_completion
  AFTER UPDATE OF status ON public.journey_steps
  FOR EACH ROW EXECUTE FUNCTION public._knowledge_hub_check_journey_completion();
