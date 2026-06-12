-- ============================================================
-- DigiKI: Migration 021 – Vollständige KOS-Schulungsliste (25 Termine)
-- Aktualisiert/ergänzt alle Schulungen mit echtem Titel, Zielgruppe
-- (Lehrkräfte vs. „nur für SL!" = Schulleitung) und Starttermin.
-- Das Startdatum ist nur der erste von je drei (nicht zwingend
-- aufeinanderfolgenden) Seminartagen mit denselben Teilnehmenden –
-- für die Planung zählen Starttermin + Teilnehmerliste.
-- Setzt Migration 019 voraus. Idempotent (ON CONFLICT DO UPDATE).
-- Ausführen im Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

INSERT INTO public.training_events (kurs_nr, title, audience, start_date)
VALUES
  ('KOS.2634.140', 'DigiKI – Das Digitalisierungs- & KI-Seminar für Lehrkräfte an Grundschulen (Gruppe 1)',                'teacher',    '2026-08-17'),
  ('KOS.2634.141', 'DigiKI – Das Digitalisierungs- & KI-Seminar für Lehrkräfte an Grundschulen (Gruppe 2)',                'teacher',    '2026-08-18'),
  ('KOS.2634.142', 'DigiKI – Das Digitalisierungs- & KI-Seminar für Lehrkräfte an Grundschulen (Gruppe 3)',                'teacher',    '2026-08-19'),
  ('KOS.2635.143', 'DigiKI – Das Digitalisierungs- & KI-Seminar für Lehrkräfte an Grundschulen (Gruppe 4)',                'teacher',    '2026-08-24'),
  ('KOS.2635.144', 'DigiKI – Das Digitalisierungs- & KI-Seminar für Lehrkräfte an Grundschulen (Gruppe 5)',                'teacher',    '2026-08-25'),
  ('KOS.2635.151', 'DigiKI – Das Digitalisierungs- & KI-Seminar für Lehrkräfte an Grundschulen (Gruppe 6 – nur für SL!)',  'leadership', '2026-08-26'),
  ('KOS.2636.152', 'DigiKI – Das Digitalisierungs- & KI-Seminar für Lehrkräfte an Grundschulen (Gruppe 7)',                'teacher',    '2026-08-31'),
  ('KOS.2636.153', 'DigiKI – Das Digitalisierungs- & KI-Seminar für Lehrkräfte an Grundschulen (Gruppe 8 – nur für SL!)',  'leadership', '2026-09-01'),
  ('KOS.2636.154', 'DigiKI – Das Digitalisierungs- & KI-Seminar für Lehrkräfte an Grundschulen (Gruppe 9)',                'teacher',    '2026-09-02'),
  ('KOS.2637.155', 'DigiKI – Das Digitalisierungs- & KI-Seminar für Lehrkräfte an Grundschulen (Gruppe 10 – nur für SL!)', 'leadership', '2026-09-07'),
  ('KOS.2637.164', 'DigiKI – Das Digitalisierungs- & KI-Seminar für Lehrkräfte an Grundschulen (Gruppe 11)',               'teacher',    '2026-09-07'),
  ('KOS.2637.165', 'DigiKI – Das Digitalisierungs- & KI-Seminar für Lehrkräfte an Grundschulen (Gruppe 12)',               'teacher',    '2026-09-08'),
  ('KOS.2638.166', 'DigiKI – Das Digitalisierungs- & KI-Seminar für Lehrkräfte an Grundschulen (Gruppe 13 – nur für SL!)', 'leadership', '2026-09-14'),
  ('KOS.2638.167', 'DigiKI – Das Digitalisierungs- & KI-Seminar für Lehrkräfte an Grundschulen (Gruppe 14)',               'teacher',    '2026-09-15'),
  ('KOS.2639.168', 'DigiKI – Das Digitalisierungs- & KI-Seminar für Lehrkräfte an Grundschulen (Gruppe 15)',               'teacher',    '2026-09-21'),
  ('KOS.2639.169', 'DigiKI – Das Digitalisierungs- & KI-Seminar für Lehrkräfte an Grundschulen (Gruppe 16 – nur für SL!)', 'leadership', '2026-09-22'),
  ('KOS.2644.170', 'DigiKI – Das Digitalisierungs- & KI-Seminar für Lehrkräfte an Grundschulen (Gruppe 17)',               'teacher',    '2026-10-26'),
  ('KOS.2644.171', 'DigiKI – Das Digitalisierungs- & KI-Seminar für Lehrkräfte an Grundschulen (Gruppe 18)',               'teacher',    '2026-10-27'),
  ('KOS.2645.172', 'DigiKI – Das Digitalisierungs- & KI-Seminar für Lehrkräfte an Grundschulen (Gruppe 19 – nur für SL!)', 'leadership', '2026-11-02'),
  ('KOS.2645.173', 'DigiKI – Das Digitalisierungs- & KI-Seminar für Lehrkräfte an Grundschulen (Gruppe 20)',               'teacher',    '2026-11-03'),
  ('KOS.2646.174', 'DigiKI – Das Digitalisierungs- & KI-Seminar für Lehrkräfte an Grundschulen (Gruppe 21)',               'teacher',    '2026-11-09'),
  ('KOS.2646.175', 'DigiKI – Das Digitalisierungs- & KI-Seminar für Lehrkräfte an Grundschulen (Gruppe 22 – nur für SL!)', 'leadership', '2026-11-10'),
  ('KOS.2647.176', 'DigiKI – Das Digitalisierungs- & KI-Seminar für Lehrkräfte an Grundschulen (Gruppe 23)',               'teacher',    '2026-11-16'),
  ('KOS.2647.177', 'DigiKI – Das Digitalisierungs- & KI-Seminar für Lehrkräfte an Grundschulen (Gruppe 24)',               'teacher',    '2026-11-17'),
  ('KOS.2648.178', 'DigiKI – Das Digitalisierungs- & KI-Seminar für Lehrkräfte an Grundschulen (Gruppe 25 – nur für SL!)', 'leadership', '2026-11-23')
ON CONFLICT (kurs_nr) DO UPDATE
  SET title      = EXCLUDED.title,
      audience   = EXCLUDED.audience,
      start_date = EXCLUDED.start_date;
