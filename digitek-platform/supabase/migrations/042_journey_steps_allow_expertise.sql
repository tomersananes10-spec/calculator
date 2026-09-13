-- מודול "אשכולות והתמחויות" (expertise) חובר למרכז הידע (09.09.2026) אבל ה-CHECK
-- על journey_steps.module_key לא עודכן — לכן AI שמחזיר שלב expertise נכשל על
-- "journey_steps_module_key_check". מרחיבים את הרשימה לכלול expertise.

alter table public.journey_steps
  drop constraint if exists journey_steps_module_key_check;

alter table public.journey_steps
  add constraint journey_steps_module_key_check
  check (module_key in ('brief','takam','aiml','tenders','roved5','suppliers','expertise'));
