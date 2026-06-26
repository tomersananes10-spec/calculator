-- tender_create RPC does not accept journey_step_id, so the wizard sets it
-- via a follow-up UPDATE after the RPC returns the new tender id. Extend the
-- trigger so it also fires on that UPDATE.

DROP TRIGGER IF EXISTS tenders_complete_journey_step ON public.tenders;

CREATE TRIGGER tenders_complete_journey_step
  AFTER INSERT OR UPDATE OF journey_step_id ON public.tenders
  FOR EACH ROW EXECUTE FUNCTION public._knowledge_hub_complete_step();
