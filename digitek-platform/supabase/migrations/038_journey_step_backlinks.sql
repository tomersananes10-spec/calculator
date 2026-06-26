-- Knowledge Hub — back-links from existing entities (briefs/calculations/tenders)
-- to the journey_step that opened them, plus a trigger that auto-marks the step
-- as done with linked_entity_table + linked_entity_id.

ALTER TABLE public.briefs       ADD COLUMN IF NOT EXISTS journey_step_id uuid REFERENCES public.journey_steps(id) ON DELETE SET NULL;
ALTER TABLE public.calculations ADD COLUMN IF NOT EXISTS journey_step_id uuid REFERENCES public.journey_steps(id) ON DELETE SET NULL;
ALTER TABLE public.tenders      ADD COLUMN IF NOT EXISTS journey_step_id uuid REFERENCES public.journey_steps(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS briefs_journey_step_idx       ON public.briefs (journey_step_id) WHERE journey_step_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS calculations_journey_step_idx ON public.calculations (journey_step_id) WHERE journey_step_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS tenders_journey_step_idx      ON public.tenders (journey_step_id) WHERE journey_step_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public._knowledge_hub_complete_step()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.journey_step_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.journey_steps
     SET status              = 'done',
         linked_entity_table = TG_TABLE_NAME,
         linked_entity_id    = NEW.id,
         completed_at        = now()
   WHERE id = NEW.journey_step_id
     AND status <> 'done';

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS briefs_complete_journey_step       ON public.briefs;
DROP TRIGGER IF EXISTS calculations_complete_journey_step ON public.calculations;
DROP TRIGGER IF EXISTS tenders_complete_journey_step      ON public.tenders;

CREATE TRIGGER briefs_complete_journey_step
  AFTER INSERT ON public.briefs
  FOR EACH ROW EXECUTE FUNCTION public._knowledge_hub_complete_step();

CREATE TRIGGER calculations_complete_journey_step
  AFTER INSERT ON public.calculations
  FOR EACH ROW EXECUTE FUNCTION public._knowledge_hub_complete_step();

CREATE TRIGGER tenders_complete_journey_step
  AFTER INSERT ON public.tenders
  FOR EACH ROW EXECUTE FUNCTION public._knowledge_hub_complete_step();
