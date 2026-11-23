-- ============================================================
-- Migration 041: Keine zweite Registrierung für dieselbe Schule
-- ============================================================
-- Je Schule gibt es ein Konto. Bisher prüfte das nur die
-- Registrierung für das Schulungsmaterial (school_has_account).
-- Lehrkräfte einer schon registrierten Schule konnten trotzdem
-- eine zweite Bestandsaufnahme mit eigenem Konto einreichen.
--
-- school_is_registered() erkennt eine Schule als vorhanden, wenn
--   • ein Schulkonto unter diesem Schulnamen existiert ODER
--   • eine Bestandsaufnahme unter diesem Schulnamen vorliegt –
-- jeweils tolerant gegenüber der Schreibweise
-- (normalize_school_match) und über die von Hand gepflegte
-- Zuordnungsliste aus dem Schulungs-Dashboard (school_aliases).
--
-- p_exclude_user: das eigene Konto ausnehmen – für Material-Konten,
-- die ihre Bestandsaufnahme nachholen.
--
-- Genutzt von beiden Registrierungen und von der Vorab-Prüfung im
-- Bestandsaufnahme-Formular. Ohne diese Migration bleibt es beim
-- bisherigen Verhalten.
--
-- Setzt Migration 024 und 026 voraus. Wiederholbar.
-- Ausführen im Supabase SQL Editor.
-- ============================================================

CREATE OR REPLACE FUNCTION public.school_is_registered(
  p_school TEXT,
  p_exclude_user UUID DEFAULT NULL
)
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
      AND (p_exclude_user IS NULL OR p.id <> p_exclude_user)
  )
  OR EXISTS (
    SELECT 1
    FROM public.bestandsaufnahme_responses b
    JOIN namen n ON public.normalize_school_match(b.school_name) = n.key
    WHERE coalesce(n.key, '') <> ''
      AND (p_exclude_user IS NULL OR b.user_id IS DISTINCT FROM p_exclude_user)
  );
$$;

REVOKE ALL ON FUNCTION public.school_is_registered(TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.school_is_registered(TEXT, UUID) TO service_role;
