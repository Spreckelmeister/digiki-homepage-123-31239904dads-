-- ============================================================
-- DigiKI: Migration 026 – Persistente Schul-Zuordnungsliste (Aliase)
-- Speichert dauerhaft, welcher (nicht automatisch erkannte) Schulname aus
-- den Importdateien zu welcher registrierten Schule gehört. Diese Liste
-- ÜBERLEBT das Zurücksetzen der Daten und wird beim Import automatisch
-- angewendet – so wird z. B. auch die 2./3. Lehrkraft derselben Schule
-- direkt richtig zugeordnet. Admins können Einträge im Dashboard wieder
-- entfernen (mit Rückabwicklung der Folgen).
-- Setzt Migration 019 voraus. Idempotent.
-- Ausführen im Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.school_aliases (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Normalisierter Schlüssel des Import-Schulnamens (schoolMatchKey).
  alias_key      TEXT NOT NULL UNIQUE,
  -- Original-Schulname aus der Importdatei (zur Anzeige).
  alias_label    TEXT NOT NULL,
  -- Name der registrierten Schule, auf die abgebildet wird (Text, damit der
  -- Alias unabhängig von gelöschten schools-Zeilen bestehen bleibt).
  canonical_name TEXT NOT NULL,
  -- true = automatisch beim Import erkannt; false = manuell zugewiesen.
  is_auto        BOOLEAN NOT NULL DEFAULT false,
  created_by     UUID,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Falls die Tabelle aus einer früheren Version ohne is_auto stammt:
ALTER TABLE public.school_aliases
  ADD COLUMN IF NOT EXISTS is_auto BOOLEAN NOT NULL DEFAULT false;

-- Welche Anmeldung wurde über welchen Alias zugeordnet (für die
-- Rückabwicklung beim Löschen eines Alias).
ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS alias_id UUID
  REFERENCES public.school_aliases(id) ON DELETE SET NULL;

-- RLS aktiv, KEINE Policy → nur per Service-Role (serverseitig) erreichbar.
ALTER TABLE public.school_aliases ENABLE ROW LEVEL SECURITY;
