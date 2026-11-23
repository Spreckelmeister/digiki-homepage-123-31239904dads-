-- ============================================================
-- Migration 040: „Ein Konto je Schule" nutzt die Zuordnungsliste
-- ============================================================
-- Die Registrierung nur für das Schulungsmaterial lehnt eine Schule
-- ab, für die es schon ein Konto gibt (school_has_account,
-- Migration 038). Bisher verglich sie nur die Schreibweise des
-- Schulnamens (normalize_school_match).
--
-- Jetzt berücksichtigt sie zusätzlich die von Hand gepflegte
-- Zuordnungsliste aus dem Schulungs-Dashboard (school_aliases,
-- Migration 026): Ist dort hinterlegt, dass „GS Musterdorf" zur
-- registrierten „Grundschule am Musterberg" gehört, gilt die Schule
-- unter beiden Namen als vorhanden.
--
-- Setzt Migration 024, 026 und 038 voraus. Wiederholbar.
-- Ausführen im Supabase SQL Editor.
-- ============================================================

CREATE OR REPLACE FUNCTION public.school_has_account(p_school TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH eingabe AS (
    SELECT coalesce(public.normalize_school_match(p_school), '') AS key
  ),
  namen AS (
    -- der eingegebene Name selbst
    SELECT key FROM eingabe
    UNION
    -- Eingabe ist ein zugeordneter Name → registrierte Schule
    SELECT public.normalize_school_match(a.canonical_name)
    FROM public.school_aliases a, eingabe e
    WHERE e.key IN (a.alias_key, public.normalize_school_match(a.alias_label))
    UNION
    -- Eingabe ist die registrierte Schule → ihre zugeordneten Namen
    SELECT public.normalize_school_match(a.alias_label)
    FROM public.school_aliases a, eingabe e
    WHERE public.normalize_school_match(a.canonical_name) = e.key
  )
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN namen n ON public.normalize_school_match(p.school) = n.key
    WHERE p.role::text = 'teacher'
      AND coalesce(n.key, '') <> ''
  );
$$;

REVOKE ALL ON FUNCTION public.school_has_account(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.school_has_account(TEXT) TO service_role;
