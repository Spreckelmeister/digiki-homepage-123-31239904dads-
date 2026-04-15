-- ============================================================
-- Migration 014: ai_purposes_other-Spalte ergänzen
-- Fügt eine optionale Textspalte für die "Sonstiges"-Eingabe
-- bei Frage 21 ("Falls KI genutzt wird – wofür?") hinzu.
-- Additiv – bestehende Daten bleiben unverändert.
-- Ausführen im Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

ALTER TABLE public.bestandsaufnahme_responses
  ADD COLUMN IF NOT EXISTS ai_purposes_other TEXT;
