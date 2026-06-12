-- ============================================================
-- Migration 018: count_participating_schools()
-- Anonyme Zähler-RPC für die öffentliche Startseiten-Statistik.
-- Gibt NUR eine Zahl zurück (distinct count) – keine PII, keine
-- Schul-Namen, keine Personendaten. Daher auch für `anon` freigegeben.
--
-- Zähl-Logik (spiegelt dedupeBySchool() aus
-- src/lib/bestandsaufnahme/aggregations.ts, damit die Startseite
-- exakt dieselbe Zahl zeigt wie /best-practice/admin/bestandsaufnahme/auswertung):
--
--   1. Test- und Admin-Einreichungen ausschließen
--      (NOT ILIKE '%test%' / '%admin%')
--   2. school_name normalisieren: trim → lower → mehrfach-Leerzeichen
--      zu einem zusammenfassen. „GS  Stüveschule" und
--      „gs stüveschule " zählen damit als dieselbe Schule.
--   3. Rows ohne school_name bekommen einen row-individuellen Key (id),
--      sodass sie nicht zusammenfallen, sondern jeweils einzeln gezählt
--      werden (identisch zur JS-Logik).
--
-- Ausführen im Supabase SQL Editor (Dashboard > SQL Editor) –
-- ersetzt die vorherige Variante (CREATE OR REPLACE).
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
  SELECT COUNT(*) INTO total FROM (
    SELECT DISTINCT
      CASE
        WHEN school_name IS NULL OR length(trim(school_name)) = 0
          THEN id::text
        ELSE regexp_replace(lower(trim(school_name)), '\s+', ' ', 'g')
      END AS school_key
    FROM public.bestandsaufnahme_responses
    WHERE
      (school_name IS NULL OR school_name NOT ILIKE '%test%')
      AND
      (school_name IS NULL OR school_name NOT ILIKE '%admin%')
  ) deduped;

  RETURN COALESCE(total, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.count_participating_schools() TO anon, authenticated;
