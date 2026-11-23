-- ============================================================
-- Migration 038: Schulungsmaterial + Regel für E-Mail-Domains
-- ============================================================
-- 1. Bereich „Schulungsmaterial" (/schulungsmaterial): gekaufte
--    Schulungsinhalte. Admins laden einzelne Dateien hoch und
--    schalten sie frei. Lesen dürfen alle Schulkonten – auch
--    Konten, die sich nur für diesen Bereich registriert haben
--    (ohne Bestandsaufnahme). Die Dateien liegen in einem privaten
--    Speicher-Bucket und werden nur über kurzlebige Links zur
--    Ansicht ausgeliefert.
--
-- 2. Konten ohne Bestandsaufnahme sind keine Programm-Schulen:
--    keine Anträge (Hilfskräfte, Tool-Lizenzen), kein Einreichen
--    von Best Practice. Die Datenbank setzt das selbst durch.
--
-- 3. Private E-Mail-Adressen (gmail, gmx, web.de …) sind für
--    Schulkonten gesperrt – bei beiden Registrierungen und bei
--    jeder späteren Änderung der Adresse. Die Liste pflegen Admins
--    unter Admin › Schulungsmaterial.
--
-- Ohne diese Migration laufen Anmeldung, Bestandsaufnahme und
-- Anträge unverändert weiter; der Bereich Schulungsmaterial meldet
-- dann „noch nicht eingerichtet".
--
-- 4. Einreichungen nur noch mit Anmeldung: Anträge, Best Practice
--    und Bestandsaufnahme lassen sich nicht mehr anonym direkt in
--    die Datenbank schreiben (Abschnitt 5).
--
-- Setzt Migration 024, 035 und 036 voraus. Wiederholbar.
-- Ausführen im Supabase SQL Editor.
-- ============================================================


-- ── 1. Wer ist Programm-Schule? ─────────────────────────────

-- Hat das angemeldete Konto eine Bestandsaufnahme? Gleiche Zuordnung
-- wie get_my_bestandsaufnahme (Migration 009): über user_id oder über
-- die Kontakt-Adresse.
CREATE OR REPLACE FUNCTION public.has_bestandsaufnahme()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.bestandsaufnahme_responses br
    WHERE br.user_id = (SELECT auth.uid())
       OR lower(br.contact_email) = (
            SELECT lower(u.email) FROM auth.users u WHERE u.id = (SELECT auth.uid())
          )
  );
$$;

REVOKE ALL ON FUNCTION public.has_bestandsaufnahme() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_bestandsaufnahme() TO authenticated, service_role;

-- Darf das Konto die Angebote des Förderprogramms nutzen?
-- Admin und Schulungsteam (stellvertretend für Schulen) immer,
-- Schulkonten nur mit Bestandsaufnahme.
CREATE OR REPLACE FUNCTION public.can_use_program()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
           SELECT 1 FROM public.profiles p
           WHERE p.id = (SELECT auth.uid())
             AND p.role::text IN ('admin', 'schulungsteam')
         )
      OR public.has_bestandsaufnahme();
$$;

REVOKE ALL ON FUNCTION public.can_use_program() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_use_program() TO authenticated, service_role;

-- Anträge und Best-Practice-Einreichungen: angemeldete Konten nur als
-- Programm-Schule. (RESTRICTIVE = zusätzliche Bedingung zu den
-- bestehenden Policies.)
DROP POLICY IF EXISTS "Nur Programm-Schulen" ON public.applications_student_assistants;
CREATE POLICY "Nur Programm-Schulen"
  ON public.applications_student_assistants AS RESTRICTIVE FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.can_use_program()));

DROP POLICY IF EXISTS "Nur Programm-Schulen" ON public.applications_tool_licenses;
CREATE POLICY "Nur Programm-Schulen"
  ON public.applications_tool_licenses AS RESTRICTIVE FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.can_use_program()));

DROP POLICY IF EXISTS "Nur Programm-Schulen" ON public.best_practices;
CREATE POLICY "Nur Programm-Schulen"
  ON public.best_practices AS RESTRICTIVE FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.can_use_program()));


-- ── 2. Schulungsmaterial ────────────────────────────────────

-- Zugriff auf freigeschaltetes Material: Schulkonten und Admins.
-- (Das Schulungsteam bleibt auf sein Dashboard beschränkt.)
CREATE OR REPLACE FUNCTION public.has_material_access()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND p.role::text IN ('teacher', 'admin')
  );
$$;

REVOKE ALL ON FUNCTION public.has_material_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_material_access() TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.schulungsmaterial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  -- Bestimmt die Anzeige. Nur Arten, die sich im Browser ansehen lassen.
  kind TEXT NOT NULL CHECK (kind IN ('video', 'audio', 'pdf', 'image')),
  -- Pfad im privaten Bucket „schulungsmaterial".
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  original_name TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  -- true, sobald die Datei vollständig hochgeladen ist.
  uploaded BOOLEAN NOT NULL DEFAULT false,
  -- Freischaltung durch einen Admin.
  published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT schulungsmaterial_freigabe_braucht_datei CHECK (NOT published OR uploaded)
);

CREATE INDEX IF NOT EXISTS schulungsmaterial_sort_idx
  ON public.schulungsmaterial (sort_order, created_at);

ALTER TABLE public.schulungsmaterial ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin: Voller Zugriff" ON public.schulungsmaterial;
CREATE POLICY "Admin: Voller Zugriff"
  ON public.schulungsmaterial FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role::text = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role::text = 'admin')
  );

DROP POLICY IF EXISTS "Schulen: Freigeschaltetes lesen" ON public.schulungsmaterial;
CREATE POLICY "Schulen: Freigeschaltetes lesen"
  ON public.schulungsmaterial FOR SELECT
  TO authenticated
  USING (published AND (SELECT public.has_material_access()));

DROP POLICY IF EXISTS "Admins nur mit 2FA" ON public.schulungsmaterial;
CREATE POLICY "Admins nur mit 2FA"
  ON public.schulungsmaterial AS RESTRICTIVE FOR ALL
  TO authenticated
  USING (NOT (SELECT public.current_user_needs_mfa()))
  WITH CHECK (NOT (SELECT public.current_user_needs_mfa()));

-- Privater Bucket. Bewusst OHNE storage-Policies: Hochladen und
-- Ausliefern laufen ausschließlich über Server-Routen mit dem
-- Service-Role-Key (signierte Links), nie direkt aus dem Browser.
INSERT INTO storage.buckets (id, name, public)
VALUES ('schulungsmaterial', 'schulungsmaterial', false)
ON CONFLICT (id) DO NOTHING;

-- Ein Konto je Schule: Gibt es für diesen Schulnamen schon ein
-- Schulkonto? (Abgleich wie bei der Sperrliste, Migration 037.)
CREATE OR REPLACE FUNCTION public.school_has_account(p_school TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(public.normalize_school_match(p_school), '') <> ''
     AND EXISTS (
       SELECT 1 FROM public.profiles p
       WHERE p.role::text = 'teacher'
         AND public.normalize_school_match(p.school) = public.normalize_school_match(p_school)
     );
$$;

REVOKE ALL ON FUNCTION public.school_has_account(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.school_has_account(TEXT) TO service_role;


-- ── 3. Gesperrte E-Mail-Domains ─────────────────────────────

CREATE TABLE IF NOT EXISTS public.blocked_email_domains (
  -- Kleingeschrieben, ohne „@". Gilt auch für Subdomains.
  domain TEXT PRIMARY KEY CHECK (domain = lower(domain) AND domain NOT LIKE '%@%' AND domain <> ''),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.blocked_email_domains ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin: Voller Zugriff" ON public.blocked_email_domains;
CREATE POLICY "Admin: Voller Zugriff"
  ON public.blocked_email_domains FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role::text = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role::text = 'admin')
  );

DROP POLICY IF EXISTS "Admins nur mit 2FA" ON public.blocked_email_domains;
CREATE POLICY "Admins nur mit 2FA"
  ON public.blocked_email_domains AS RESTRICTIVE FOR ALL
  TO authenticated
  USING (NOT (SELECT public.current_user_needs_mfa()))
  WITH CHECK (NOT (SELECT public.current_user_needs_mfa()));

-- Grundbestand: verbreitete private Postfächer und Wegwerf-Adressen.
INSERT INTO public.blocked_email_domains (domain) VALUES
  ('gmail.com'), ('googlemail.com'),
  ('gmx.de'), ('gmx.net'), ('gmx.at'), ('gmx.ch'), ('gmx.com'), ('gmx.org'), ('gmx.info'),
  ('web.de'), ('email.de'), ('mail.de'),
  ('t-online.de'), ('magenta.de'),
  ('freenet.de'), ('arcor.de'), ('vodafone.de'), ('vodafonemail.de'), ('o2online.de'),
  ('1und1.de'), ('online.de'), ('kabelmail.de'), ('unitybox.de'), ('ewe.net'), ('ewetel.net'), ('osnanet.de'),
  ('outlook.com'), ('outlook.de'), ('hotmail.com'), ('hotmail.de'), ('live.com'), ('live.de'), ('msn.com'),
  ('yahoo.com'), ('yahoo.de'), ('ymail.com'), ('aol.com'), ('aol.de'),
  ('icloud.com'), ('me.com'), ('mac.com'),
  ('posteo.de'), ('posteo.net'), ('mailbox.org'), ('tutanota.com'), ('tutanota.de'), ('tuta.io'), ('tuta.com'),
  ('proton.me'), ('protonmail.com'), ('pm.me'),
  ('mail.com'), ('yandex.com'), ('zoho.com'),
  ('mailinator.com'), ('guerrillamail.com'), ('10minutemail.com'), ('trashmail.com'),
  ('trash-mail.com'), ('tempmail.com'), ('temp-mail.org'), ('yopmail.com'), ('sharklasers.com')
ON CONFLICT (domain) DO NOTHING;

-- Prüfung: Liegt die Adresse auf einer gesperrten Domain (oder einer
-- Subdomain davon)?
CREATE OR REPLACE FUNCTION public.is_email_domain_blocked(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.blocked_email_domains b,
         (SELECT lower(split_part(trim(coalesce(p_email, '')), '@', 2)) AS d) e
    WHERE e.d <> ''
      AND (e.d = b.domain OR e.d LIKE '%.' || b.domain)
  );
$$;

REVOKE ALL ON FUNCTION public.is_email_domain_blocked(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_email_domain_blocked(TEXT) TO authenticated, service_role;


-- ── 4. Absicherung in der Datenbank: Adress-Änderung ────────
-- Die Kontoseite ändert die Adresse direkt über Supabase Auth (ohne
-- eigene Server-Route). Damit die Regel dort nicht umgangen werden
-- kann, prüft dieser Trigger jede ÄNDERUNG der Adresse eines
-- Schulkontos. Er greift nur, wenn sich die Adresse wirklich ändert:
-- bestehende Konten mit privater Adresse können sich weiter anmelden.
-- Admin- und Schulungsteam-Konten sind ausgenommen.
--
-- Rückgängig machen:
--   DROP TRIGGER IF EXISTS enforce_school_email_domain ON auth.users;
CREATE OR REPLACE FUNCTION public.enforce_school_email_domain()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role TEXT;
BEGIN
  IF NEW.email IS NOT DISTINCT FROM OLD.email
     AND NEW.email_change IS NOT DISTINCT FROM OLD.email_change THEN
    RETURN NEW;
  END IF;

  SELECT p.role::text INTO v_role FROM public.profiles p WHERE p.id = NEW.id;
  IF v_role IN ('admin', 'schulungsteam') THEN
    RETURN NEW;
  END IF;

  IF (NEW.email IS DISTINCT FROM OLD.email
        AND public.is_email_domain_blocked(NEW.email))
     OR (NEW.email_change IS DISTINCT FROM OLD.email_change
        AND coalesce(NEW.email_change, '') <> ''
        AND public.is_email_domain_blocked(NEW.email_change)) THEN
    RAISE EXCEPTION 'EMAIL_DOMAIN_NOT_ALLOWED'
      USING HINT = 'Private E-Mail-Adressen sind für Schulkonten nicht zugelassen.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_school_email_domain ON auth.users;
CREATE TRIGGER enforce_school_email_domain
  BEFORE UPDATE OF email, email_change ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_school_email_domain();


-- ── 5. Keine Einreichungen ohne Anmeldung ───────────────────
-- Bisher durfte auch die anonyme Rolle direkt in diese Tabellen
-- schreiben (Migration 001/003/005) – an den Formularen vorbei, die
-- längst eine Anmeldung verlangen.

-- Anträge: nur angemeldete Konten (zusätzlich gilt „Nur Programm-Schulen").
DROP POLICY IF EXISTS "Öffentlich: Antrag einreichen" ON public.applications_student_assistants;
DROP POLICY IF EXISTS "Angemeldet: Antrag einreichen" ON public.applications_student_assistants;
CREATE POLICY "Angemeldet: Antrag einreichen"
  ON public.applications_student_assistants FOR INSERT
  TO authenticated
  WITH CHECK (status = 'neu');

DROP POLICY IF EXISTS "Öffentlich: Antrag einreichen" ON public.applications_tool_licenses;
DROP POLICY IF EXISTS "Angemeldet: Antrag einreichen" ON public.applications_tool_licenses;
CREATE POLICY "Angemeldet: Antrag einreichen"
  ON public.applications_tool_licenses FOR INSERT
  TO authenticated
  WITH CHECK (status = 'neu');

-- Best Practice: Die anonyme Einreichung entfällt. Angemeldete Konten
-- reichen wie bisher ein (eigene Policy, hier unverändert).
DROP POLICY IF EXISTS "Öffentlich: Best Practice einreichen" ON public.best_practices;

-- Bestandsaufnahme: Antworten schreibt ausschließlich die Server-Route
-- /api/register-bestandsaufnahme (Service-Role-Key). Ohne diese Sperre
-- könnte sich ein Konto selbst eine Bestandsaufnahme eintragen und so
-- zur Programm-Schule machen.
DROP POLICY IF EXISTS "Öffentlich: Antwort einreichen" ON public.bestandsaufnahme_responses;
