-- ============================================================
-- DigiKI: Migration 020 – Schul-Teilnahmeübersicht
-- Zeigt ALLE teilnahmeberechtigten Schulen (= Schulen aus der
-- Bestandsaufnahme) zusammen mit ihrem Anmeldestatus, damit
-- sichtbar wird, welche Schulen sich noch NICHT angemeldet haben.
-- Setzt Migration 019 voraus.
-- Ausführen im Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- ── 1. Normalisierungs-Helfer ────────────────────────────────
-- Erzeugt denselben Schlüssel wie schoolKeyFromName() im Frontend
-- (lowercase, Whitespace zusammengefasst, abschließende Satzzeichen
-- entfernt), damit Schulnamen aus Bestandsaufnahme und Import-Schulen
-- zuverlässig gematcht werden.
CREATE OR REPLACE FUNCTION public.normalize_school_key(name TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT regexp_replace(
           regexp_replace(lower(trim(coalesce(name, ''))), '\s+', ' ', 'g'),
           '[.,;]+$', ''
         );
$$;

-- ── 2. View: Teilnahme je Schule ─────────────────────────────
-- FULL OUTER JOIN aus zwei Quellen:
--   bestand  = teilnahmeberechtigte Schulen (Bestandsaufnahme)
--   imported = Schulen, die bereits in einem Import vorkamen (mit
--              Quotennutzung)
-- So erscheinen auch Schulen, die zwar berechtigt sind, aber noch
-- niemanden angemeldet haben (has_registered = false).
CREATE OR REPLACE VIEW public.school_participation
WITH (security_invoker = true) AS
WITH bestand AS (
  SELECT DISTINCT ON (public.normalize_school_key(school_name))
    public.normalize_school_key(school_name) AS school_key,
    trim(school_name)                         AS name,
    school_location                           AS city
  FROM public.bestandsaufnahme_responses
  WHERE school_name IS NOT NULL
    AND length(trim(school_name)) > 0
    AND school_name NOT ILIKE '%test%'
    AND school_name NOT ILIKE '%admin%'
  ORDER BY public.normalize_school_key(school_name), created_at
),
imported AS (
  SELECT
    s.id                                      AS school_id,
    s.school_key,
    s.name,
    s.city,
    s.plz,
    COUNT(DISTINCT r.person_id) FILTER (
      WHERE r.role = 'teacher' AND r.status = 'registered'
    ) AS teachers_used,
    COUNT(DISTINCT r.person_id) FILTER (
      WHERE r.role = 'leadership' AND r.status = 'registered'
    ) AS leadership_used
  FROM public.schools s
  LEFT JOIN public.registrations r ON r.school_id = s.id
  GROUP BY s.id, s.school_key, s.name, s.city, s.plz
)
SELECT
  i.school_id                                       AS school_id,
  COALESCE(i.school_key, b.school_key)              AS school_key,
  COALESCE(b.name, i.name)                          AS name,
  COALESCE(i.city, b.city)                          AS city,
  i.plz                                             AS plz,
  COALESCE(i.teachers_used, 0)::int                 AS teachers_used,
  COALESCE(i.leadership_used, 0)::int               AS leadership_used,
  2                                                 AS teacher_limit,
  1                                                 AS leadership_limit,
  (b.school_key IS NOT NULL)                        AS in_bestandsaufnahme,
  (COALESCE(i.teachers_used, 0) + COALESCE(i.leadership_used, 0)) > 0
                                                    AS has_registered
FROM bestand b
FULL OUTER JOIN imported i
  ON i.school_key = b.school_key;
