ALTER TABLE public.training_events
ADD COLUMN IF NOT EXISTS registration_deadline DATE;
