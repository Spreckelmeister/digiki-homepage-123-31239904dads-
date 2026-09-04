-- ============================================================
-- Migration 033: NLC-Abgleich (Anmeldeschluss automatisch)
-- ============================================================
-- Der Anmeldeschluss der KOS-Schulungen wird künftig automatisch
-- aus dem Niedersächsischen LernCenter (nlc.info) ausgelesen
-- (täglicher Vercel-Cron + Admin-Knopf im Schulungsdashboard).
--
-- VOR dem Deploy des zugehörigen Codes ausführen: Der Sync
-- schreibt in die neue Spalte deadline_synced_at.
-- ============================================================

-- Wann wurde der Anmeldeschluss zuletzt erfolgreich mit NLC
-- abgeglichen? (Provenienz – im Dashboard sichtbar.)
ALTER TABLE public.training_events
ADD COLUMN IF NOT EXISTS deadline_synced_at TIMESTAMPTZ;

-- Über das Dashboard angelegte Termine haben bisher kein
-- nlc_event_id (die API setzte es nie) – aus dem hinterlegten
-- Anmeldelink nachtragen, damit der Sync sie sofort erfasst.
UPDATE public.training_events
SET nlc_event_id = (regexp_match(anmeldung_url, '/event/(\d+)'))[1]
WHERE nlc_event_id IS NULL
  AND anmeldung_url ~ '/event/\d+';
