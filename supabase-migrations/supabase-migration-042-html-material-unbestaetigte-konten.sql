-- ============================================================
-- Migration 042: HTML-Material + unbestätigte Konten
-- ============================================================
-- 1. Schulungsmaterial kann jetzt auch eine HTML-Datei sein
--    (Art „html"). Sie wird in einem abgeschotteten Rahmen
--    angezeigt (siehe /schulungsmaterial/inhalt/[id]).
--
-- 2. „Schule bereits registriert" (Migration 041): Ein Schulkonto,
--    dessen E-Mail-Adresse nie bestätigt wurde, zählt nur in den
--    ersten 7 Tagen mit. So blockiert eine abgebrochene
--    Registrierung (z. B. Tippfehler in der Adresse) den Schulnamen
--    nicht dauerhaft. Eine vorhandene Bestandsaufnahme zählt weiter
--    immer.
--
-- Setzt Migration 038 und 041 voraus. Wiederholbar.
-- Ausführen im Supabase SQL Editor.
-- ============================================================

-- ── 1. Art „html" zulassen ──────────────────────────────────
ALTER TABLE public.schulungsmaterial
  DROP CONSTRAINT IF EXISTS schulungsmaterial_kind_check;
ALTER TABLE public.schulungsmaterial
  ADD CONSTRAINT schulungsmaterial_kind_check
  CHECK (kind IN ('video', 'audio', 'pdf', 'image', 'html'));

-- ── 2. Unbestätigte Konten zählen nur 7 Tage ────────────────
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
    JOIN auth.users u ON u.id = p.id
    JOIN namen n ON public.normalize_school_match(p.school) = n.key
    WHERE p.role::text = 'teacher'
      AND coalesce(n.key, '') <> ''
      AND (p_exclude_user IS NULL OR p.id <> p_exclude_user)
      -- bestätigt ODER noch frisch (wartet evtl. auf den Code)
      AND (u.email_confirmed_at IS NOT NULL
           OR u.created_at > now() - interval '7 days')
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
