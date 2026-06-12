-- ============================================================
-- DigiKI: Migration 017 – Ansprechperson pro Klassenbildungs-Session
--
-- Eltern sollen direkt sehen, an wen sie sich bei Rückfragen wenden
-- können. Die Lehrkraft kann beim Erstellen einer Session eine
-- Ansprechperson + E-Mail hinterlegen.
--
-- Beide Felder sind optional – wenn sie nicht gesetzt sind, fällt
-- die Eltern-Seite auf den Schulnamen zurück.
--
-- Ausführen im Supabase SQL Editor.
-- ============================================================

ALTER TABLE public.klassenbildung_sessions
  ADD COLUMN IF NOT EXISTS contact_name  text,
  ADD COLUMN IF NOT EXISTS contact_email text;
