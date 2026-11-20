-- ============================================================
-- Migration 037: Sperrliste für das Förderprogramm
-- ============================================================
-- Entfernt ein Admin eine Schule aus dem Förderprogramm
-- (Bestandsaufnahme › „Schule aus dem Förderprogramm entfernen"),
-- landen E-Mail-Adresse(n) und Schulname auf dieser Sperrliste.
-- Die Registrierung (/api/register-bestandsaufnahme) lehnt dann
-- jede Anmeldung ab, deren E-Mail gesperrt ist ODER deren Schulname
-- nach normalize_school_match (Migration 023/024) auf einen
-- gesperrten Namen fällt („IGS Hannover Linden" = „Hannover-Linden
-- Gesamtschule").
--
-- Admins sehen die Liste unter Bestandsaufnahme und können Sperren
-- dort wieder aufheben.
--
-- Ohne diese Migration funktioniert die Registrierung unverändert;
-- das Entfernen MIT Sperre meldet dann einen Fehler (ohne Sperre
-- geht es weiter).
--
-- Setzt Migration 024 und 036 voraus. Wiederholbar.
-- Ausführen im Supabase SQL Editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.program_blocklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Kleingeschriebene E-Mail-Adresse; NULL = reine Schulnamen-Sperre.
  email TEXT,
  school_name TEXT NOT NULL DEFAULT '',
  school_key TEXT GENERATED ALWAYS AS (public.normalize_school_match(school_name)) STORED,
  reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS program_blocklist_email_idx
  ON public.program_blocklist (email);
CREATE INDEX IF NOT EXISTS program_blocklist_school_key_idx
  ON public.program_blocklist (school_key);

ALTER TABLE public.program_blocklist ENABLE ROW LEVEL SECURITY;

-- Nur Admins lesen die Liste und heben Sperren auf. Einträge schreibt
-- die Server-Route mit dem Service-Role-Key (umgeht RLS).
DROP POLICY IF EXISTS "Admin: Voller Zugriff" ON public.program_blocklist;
CREATE POLICY "Admin: Voller Zugriff"
  ON public.program_blocklist FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role::text = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role::text = 'admin')
  );

-- 2FA-Pflicht für Admins auch auf dieser Tabelle (wie Migration 036).
DROP POLICY IF EXISTS "Admins nur mit 2FA" ON public.program_blocklist;
CREATE POLICY "Admins nur mit 2FA"
  ON public.program_blocklist AS RESTRICTIVE FOR ALL
  TO authenticated
  USING (NOT (SELECT public.current_user_needs_mfa()))
  WITH CHECK (NOT (SELECT public.current_user_needs_mfa()));

-- Prüfung für die Registrierung: E-Mail gesperrt ODER Schulname fällt
-- auf einen gesperrten Namen. Leere Schlüssel (Name nur aus Schultyp-
-- Wörtern) zählen nie als Treffer.
CREATE OR REPLACE FUNCTION public.is_program_blocked(p_email TEXT, p_school TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.program_blocklist b
    WHERE (b.email IS NOT NULL AND b.email = lower(trim(coalesce(p_email, ''))))
       OR (coalesce(b.school_key, '') <> ''
           AND b.school_key = public.normalize_school_match(p_school))
  );
$$;

REVOKE ALL ON FUNCTION public.is_program_blocked(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_program_blocked(TEXT, TEXT) TO service_role;
