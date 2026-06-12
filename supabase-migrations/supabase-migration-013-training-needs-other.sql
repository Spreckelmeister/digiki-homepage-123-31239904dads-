-- ============================================================
-- Migration 013: training_needs_other-Spalte ergänzen
-- Fügt eine optionale Textspalte für die "Sonstiges"-Eingabe
-- bei Frage 26 ("In welchen Bereichen besteht der größte
-- Fortbildungsbedarf?") hinzu. Additiv – bestehende Daten
-- bleiben unverändert.
-- Ausführen im Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

ALTER TABLE public.bestandsaufnahme_responses
  ADD COLUMN IF NOT EXISTS training_needs_other TEXT;
