-- ============================================================
-- DigiKI: Migration 024 – Schul-Form-Suffix beim Matching ignorieren
-- Schul-Form-Zusätze stehen in den Exporten oft als Suffix nach einem
-- Komma, z. B. „Lüstringer Bergschule, FöS SR". Für den Abgleich mit der
-- Bestandsaufnahme („Lüstringer Bergschule") wird daher nur der Namensteil
-- VOR dem ersten Komma verwendet. Spiegelt schoolMatchKey() im Frontend
-- (src/lib/schulungen/parse.ts).
-- Aktualisiert nur die Funktion normalize_school_match; die View
-- school_participation nutzt sie unverändert weiter.
-- Setzt Migration 023 voraus. Idempotent.
-- Ausführen im Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

CREATE OR REPLACE FUNCTION public.normalize_school_match(name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  base    TEXT;
  cleaned TEXT;
  kept    TEXT;
  allj    TEXT;
  stop    TEXT[] := ARRAY[
    'grundschule','gs','schule','schulen','förderschule','foerderschule',
    'fös','foes','fos','hauptschule','hs','grund','haupt','oberschule',
    'obs','gesamtschule','igs','kgs','ggs','ogs','realschule','rs',
    'gymnasium','gym','und'
  ];
BEGIN
  -- Nur den Namensteil vor dem ersten Komma (Schul-Form-Zusatz weg).
  base := split_part(coalesce(name, ''), ',', 1);
  cleaned := regexp_replace(lower(trim(base)), '[^a-z0-9äöüß]+', ' ', 'g');
  SELECT string_agg(t, '' ORDER BY ord) INTO kept
  FROM unnest(regexp_split_to_array(cleaned, '\s+')) WITH ORDINALITY AS x(t, ord)
  WHERE t <> '' AND NOT (t = ANY(stop));
  IF kept IS NOT NULL AND kept <> '' THEN
    RETURN kept;
  END IF;
  SELECT string_agg(t, '' ORDER BY ord) INTO allj
  FROM unnest(regexp_split_to_array(cleaned, '\s+')) WITH ORDINALITY AS x(t, ord)
  WHERE t <> '';
  RETURN COALESCE(allj, '');
END;
$$;
