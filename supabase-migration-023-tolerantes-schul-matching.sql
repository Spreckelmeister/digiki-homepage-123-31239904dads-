-- ============================================================
-- DigiKI: Migration 023 – Tolerantes Schul-Matching
-- Erkennt Schulen auch bei abweichender Schreibweise: Schultyp-Wörter
-- (Grundschule, GS, Schule, Förderschule …) werden für den Abgleich
-- ignoriert. So gilt „Grundschule Franz-Hecker-Schule" als dieselbe
-- Schule wie „Franz-Hecker-Schule".
-- Aktualisiert die View school_participation entsprechend.
-- Setzt Migration 019/020 voraus. Idempotent.
-- Ausführen im Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Toleranter Vergleichsschlüssel: lowercase, Trennzeichen entfernt,
-- Schultyp-Wörter raus, Rest zusammengezogen. Spiegelt schoolMatchKey()
-- im Frontend (src/lib/schulungen/parse.ts).
CREATE OR REPLACE FUNCTION public.normalize_school_match(name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
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
  cleaned := regexp_replace(lower(trim(coalesce(name, ''))), '[^a-z0-9äöüß]+', ' ', 'g');
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

-- View neu: gleicht über normalize_school_match ab (statt exaktem Namen).
-- Beide Seiten werden über den toleranten Schlüssel gruppiert/verknüpft,
-- sodass Namensvarianten zusammenfallen.
CREATE OR REPLACE VIEW public.school_participation
WITH (security_invoker = true) AS
WITH bestand AS (
  SELECT DISTINCT ON (public.normalize_school_match(school_name))
    public.normalize_school_match(school_name) AS mkey,
    trim(school_name)                          AS name,
    school_location                            AS city
  FROM public.bestandsaufnahme_responses
  WHERE school_name IS NOT NULL
    AND length(trim(school_name)) > 0
    AND school_name NOT ILIKE '%test%'
    AND school_name NOT ILIKE '%admin%'
  ORDER BY public.normalize_school_match(school_name), created_at
),
imported AS (
  SELECT
    public.normalize_school_match(s.name) AS mkey,
    max(s.name) AS name,
    max(s.city) AS city,
    max(s.plz)  AS plz,
    COUNT(DISTINCT r.person_id) FILTER (
      WHERE r.role = 'teacher' AND r.status = 'registered'
    ) AS teachers_used,
    COUNT(DISTINCT r.person_id) FILTER (
      WHERE r.role = 'leadership' AND r.status = 'registered'
    ) AS leadership_used
  FROM public.schools s
  LEFT JOIN public.registrations r ON r.school_id = s.id
  GROUP BY public.normalize_school_match(s.name)
)
SELECT
  NULL::uuid                                        AS school_id,
  COALESCE(i.mkey, b.mkey)                          AS school_key,
  COALESCE(b.name, i.name)                          AS name,
  COALESCE(i.city, b.city)                          AS city,
  i.plz                                             AS plz,
  COALESCE(i.teachers_used, 0)::int                 AS teachers_used,
  COALESCE(i.leadership_used, 0)::int               AS leadership_used,
  2                                                 AS teacher_limit,
  1                                                 AS leadership_limit,
  (b.mkey IS NOT NULL)                              AS in_bestandsaufnahme,
  (COALESCE(i.teachers_used, 0) + COALESCE(i.leadership_used, 0)) > 0
                                                    AS has_registered
FROM bestand b
FULL OUTER JOIN imported i ON i.mkey = b.mkey;
