-- ============================================================
-- Migration 018: count_participating_schools()
-- Anonyme Zähler-RPC für die öffentliche Startseiten-Statistik.
-- Gibt NUR eine Zahl zurück (distinct count) – keine PII, keine
-- Schul-Namen, keine Personendaten. Daher auch für `anon` freigegeben.
--
-- Ausführen im Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

CREATE OR REPLACE FUNCTION public.count_participating_schools()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  total INTEGER;
BEGIN
  -- Distinct nach school_name (case-insensitive + trimmed), damit doppelte
  -- Einreichungen derselben Schule nicht mehrfach gezählt werden.
  SELECT COUNT(DISTINCT lower(trim(school_name)))
    INTO total
    FROM public.bestandsaufnahme_responses
   WHERE school_name IS NOT NULL
     AND length(trim(school_name)) > 0;

  RETURN COALESCE(total, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.count_participating_schools() TO anon, authenticated;
