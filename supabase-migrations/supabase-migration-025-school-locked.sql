-- ============================================================
-- DigiKI: Migration 025 – Manuelle Schul-Zuweisung sperren
-- Markiert Anmeldungen, deren Schule ein Admin im Dashboard manuell
-- zugewiesen hat („Schule zuweisen"). Solche Anmeldungen werden beim
-- (Re-)Import NICHT mehr überschrieben – die manuelle Entscheidung bleibt
-- also dauerhaft erhalten.
-- Setzt Migration 019 voraus. Idempotent.
-- Ausführen im Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS school_locked BOOLEAN NOT NULL DEFAULT false;
