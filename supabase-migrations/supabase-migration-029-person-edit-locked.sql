-- ============================================================
-- DigiKI: Migration 029 – Manuell bearbeitete Personendaten sperren
-- Markiert Personen, deren Name und/oder E-Mail ein Admin im
-- Schulungsdashboard direkt bearbeitet hat (Teilnehmerliste →
-- „Bearbeiten"). Beim (Re-)Import werden Name und E-Mail solcher
-- Personen NICHT mehr überschrieben – die manuelle Korrektur bleibt
-- dauerhaft erhalten.
-- Setzt Migration 019 voraus. Idempotent.
-- Ausführen im Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

ALTER TABLE public.persons
  ADD COLUMN IF NOT EXISTS edit_locked BOOLEAN NOT NULL DEFAULT false;
