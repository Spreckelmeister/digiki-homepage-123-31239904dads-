-- ============================================================
-- DigiKI: Migration 019 – Schulungs-Dashboard
-- Excel-Import von Anmeldungen, globale Schul-Quoten,
-- Konflikt-Verwaltung und neue Rolle "schulungsteam".
-- Ausführen im Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- ── 1. Neue Rolle "schulungsteam" in profiles erlauben ───────
-- Gleichgestellt mit "teacher", einziger Unterschied:
-- Zugriff auf das Schulungs-Dashboard.
--
-- profiles.role ist ein ENUM-Typ (user_role), KEIN TEXT mit CHECK.
-- Daher den neuen Wert dem Enum hinzufügen. "ADD VALUE IF NOT EXISTS"
-- ist idempotent (Re-Run unschädlich).
--
-- WICHTIG: Ein frisch hinzugefügter Enum-Wert darf in DERSELBEN
-- Transaktion nicht verwendet werden. Damit die folgenden Objekte
-- (z. B. has_schulungen_access) trotzdem in einem Rutsch angelegt
-- werden können, vergleichen sie role über role::text statt über das
-- Enum-Literal 'schulungsteam'. Sollte Ihre Supabase-Instanz das ganze
-- Skript in EINER Transaktion ausführen und hier dennoch einen Fehler
-- melden, führen Sie nur diese eine ALTER-TYPE-Zeile separat aus und
-- starten danach den Rest.
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'schulungsteam';

-- WICHTIG: Die Self-UPDATE-Policy auf profiles (Migration 006) erlaubt
-- authentifizierten Nutzern, ihre eigene Profilzeile zu ändern – OHNE
-- Spalten-Einschränkung. Ein Nutzer könnte sich daher per direktem
-- PostgREST-Call selbst role='admin'/'schulungsteam' setzen und so die
-- gesamte Zugriffskontrolle aushebeln. Dieser Trigger friert die
-- role-Spalte für alle Schreibzugriffe ein, die NICHT über die
-- Service-Role laufen (Service-Role hat is_superuser/bypassrls und
-- setzt role legitim, z. B. in der access-Route).
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- 'service_role' ist die im Backend genutzte privilegierte Rolle.
  -- Alle anderen (authenticated/anon) dürfen role nicht verändern.
  IF current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    NEW.role := OLD.role;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_role ON public.profiles;
CREATE TRIGGER trg_protect_profile_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

-- Zugriffs-Helfer für RLS-Policies (admin ODER schulungsteam)
CREATE OR REPLACE FUNCTION public.has_schulungen_access()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    -- role::text, damit diese Funktion auch in derselben Transaktion
    -- erstellt werden kann, in der 'schulungsteam' zum Enum kam.
    WHERE id = auth.uid()
      AND role::text IN ('admin', 'schulungsteam')
  );
$$;

REVOKE EXECUTE ON FUNCTION public.has_schulungen_access() FROM anon;
GRANT EXECUTE ON FUNCTION public.has_schulungen_access() TO authenticated;

-- ── 2. updated_at-Helfer ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.schulungen_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ── 3. Tabellen ──────────────────────────────────────────────

-- Schulungen (KOS-Fortbildungen). "training_events" statt "events",
-- um Kollisionen mit generischen Tabellennamen zu vermeiden.
CREATE TABLE IF NOT EXISTS public.training_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kurs_nr       TEXT NOT NULL UNIQUE,        -- z. B. "KOS.2638.166"
  nlc_event_id  TEXT UNIQUE,                 -- externe NLC-Veranstaltungsnummer, z. B. "55355"
  title         TEXT NOT NULL,
  -- Zielgruppe bestimmt die Rolle der Angemeldeten (Lehrkraft/Leitung),
  -- da die Excel-Exporte selbst keine Rollenspalte enthalten.
  audience      TEXT NOT NULL CHECK (audience IN ('teacher', 'leadership')),
  start_date    DATE,
  end_date      DATE,
  location      TEXT,
  anmeldung_url TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.schools (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Normalisierter Schulname (lowercase, Whitespace bereinigt) als
  -- stabiler Schlüssel, da die Excel-Dateien keine Schulnummer enthalten.
  school_key  TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  street      TEXT,
  plz         TEXT,
  city        TEXT,
  phone       TEXT,
  school_type TEXT,                          -- "Schulform" aus educa-Export
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.persons (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name  TEXT NOT NULL DEFAULT '',
  last_name   TEXT NOT NULL DEFAULT '',
  -- Normalisierte Namen für format-übergreifendes Matching
  -- (NLC-Export hat E-Mail, educa-Export nicht).
  first_norm  TEXT NOT NULL,
  last_norm   TEXT NOT NULL,
  email       TEXT,
  school_id   UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Quoten begrenzen auf max. 3 Personen je Schule, daher sind
  -- Namens-Kollisionen innerhalb einer Schule praktisch ausgeschlossen.
  UNIQUE (school_id, last_norm, first_norm)
);

CREATE UNIQUE INDEX IF NOT EXISTS persons_email_unique
  ON public.persons (lower(email))
  WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.import_batches (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  file_count     INTEGER NOT NULL DEFAULT 0,
  rows_total     INTEGER NOT NULL DEFAULT 0,
  rows_new       INTEGER NOT NULL DEFAULT 0,
  rows_updated   INTEGER NOT NULL DEFAULT 0,
  rows_conflict  INTEGER NOT NULL DEFAULT 0,
  rows_error     INTEGER NOT NULL DEFAULT 0,
  -- Pro Datei: { name, kurs_nr, rows, new, updated, conflicts, errors }
  files          JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.registrations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES public.training_events(id) ON DELETE CASCADE,
  -- Schule wird auf der Anmeldung gespeichert (Snapshot), damit die
  -- Quote auch bei späterem Schulwechsel der Person stabil bleibt.
  school_id       UUID NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,
  person_id       UUID NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('teacher', 'leadership')),
  status          TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'cancelled')),
  -- true = Admin hat "Trotz Quote zulassen" gewählt; der Quoten-Trigger
  -- lässt diese Zeile durch. Das Flag ist "klebrig" (siehe Trigger),
  -- damit ein erneuter Import die Entscheidung nicht zurücksetzt.
  quota_override  BOOLEAN NOT NULL DEFAULT false,
  workshops       TEXT,
  import_batch_id UUID REFERENCES public.import_batches(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Upsert-Anker: eine Person ist pro Schulung genau einmal angemeldet.
  UNIQUE (event_id, person_id)
);

CREATE INDEX IF NOT EXISTS registrations_school_role_idx
  ON public.registrations (school_id, role, status);
CREATE INDEX IF NOT EXISTS registrations_event_idx
  ON public.registrations (event_id);

CREATE TABLE IF NOT EXISTS public.import_conflicts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_batch_id UUID REFERENCES public.import_batches(id) ON DELETE SET NULL,
  event_id        UUID NOT NULL REFERENCES public.training_events(id) ON DELETE CASCADE,
  school_id       UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  person_id       UUID REFERENCES public.persons(id) ON DELETE CASCADE,
  role            TEXT NOT NULL,
  reason          TEXT NOT NULL,
  -- Original-Zeile aus der Excel-Datei, damit "Trotz Quote zulassen"
  -- ohne erneuten Datei-Upload funktioniert.
  payload         JSONB,
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'rejected', 'approved')),
  resolved_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotenz: erneuter Import derselben Datei aktualisiert den offenen
-- Konflikt, statt einen zweiten anzulegen.
CREATE UNIQUE INDEX IF NOT EXISTS import_conflicts_open_unique
  ON public.import_conflicts (event_id, person_id)
  WHERE status = 'open';

CREATE INDEX IF NOT EXISTS import_conflicts_batch_idx
  ON public.import_conflicts (import_batch_id);

-- updated_at-Trigger
DROP TRIGGER IF EXISTS trg_training_events_updated ON public.training_events;
CREATE TRIGGER trg_training_events_updated
  BEFORE UPDATE ON public.training_events
  FOR EACH ROW EXECUTE FUNCTION public.schulungen_set_updated_at();

DROP TRIGGER IF EXISTS trg_schools_updated ON public.schools;
CREATE TRIGGER trg_schools_updated
  BEFORE UPDATE ON public.schools
  FOR EACH ROW EXECUTE FUNCTION public.schulungen_set_updated_at();

DROP TRIGGER IF EXISTS trg_persons_updated ON public.persons;
CREATE TRIGGER trg_persons_updated
  BEFORE UPDATE ON public.persons
  FOR EACH ROW EXECUTE FUNCTION public.schulungen_set_updated_at();

DROP TRIGGER IF EXISTS trg_registrations_updated ON public.registrations;
CREATE TRIGGER trg_registrations_updated
  BEFORE UPDATE ON public.registrations
  FOR EACH ROW EXECUTE FUNCTION public.schulungen_set_updated_at();

-- ── 4. Quoten-Trigger (global über alle Schulungen) ──────────
-- Jede Schule darf insgesamt max. 2 verschiedene Lehrkräfte und
-- 1 Person aus der Schulleitung anmelden – über ALLE Schulungen.
-- Eine Person, die mehrere Schulungen besucht, zählt nur einmal.
CREATE OR REPLACE FUNCTION public.enforce_school_quota()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_limit   INTEGER;
  v_used    INTEGER;
  v_already BOOLEAN;
BEGIN
  -- Eine erteilte Überschreibung bleibt erhalten, solange dieselbe
  -- Person an derselben Schule/Rolle bleibt (damit ein erneuter Import
  -- sie nicht zurücksetzt). Wechselt die Anmeldung jedoch Schule oder
  -- Rolle, gilt die Freigabe der alten Schule NICHT für die neue –
  -- dann wird regulär gegen die Quote der neuen Schule geprüft.
  IF TG_OP = 'UPDATE' AND OLD.quota_override THEN
    IF OLD.school_id = NEW.school_id AND OLD.role = NEW.role THEN
      NEW.quota_override := true;
    ELSE
      NEW.quota_override := false;
    END IF;
  END IF;

  -- Idempotenz: Hält die Zeile ihren Platz bereits (gleiche Person +
  -- Schule + Rolle, war schon 'registered'), kann ein UPDATE
  -- (Re-Import: workshops/batch) die Belegung nicht erhöhen. Ohne
  -- diesen Pass-through würde der erneute Import bereits gültiger
  -- Anmeldungen fälschlich QUOTA_EXCEEDED auslösen.
  IF TG_OP = 'UPDATE'
     AND OLD.status    = 'registered'
     AND NEW.status    = 'registered'
     AND OLD.school_id = NEW.school_id
     AND OLD.role      = NEW.role
     AND OLD.person_id = NEW.person_id THEN
    RETURN NEW;
  END IF;

  -- Stornierte Anmeldungen belegen keine Quote.
  IF NEW.status <> 'registered' THEN
    RETURN NEW;
  END IF;

  IF NEW.quota_override THEN
    RETURN NEW;
  END IF;

  -- Serialisiert konkurrierende Inserts derselben Schule+Rolle,
  -- damit die Zählung nicht durch Race Conditions umgangen wird.
  PERFORM pg_advisory_xact_lock(hashtext(NEW.school_id::text || '|' || NEW.role));

  v_limit := CASE WHEN NEW.role = 'leadership' THEN 1 ELSE 2 END;

  -- Person zählt bereits für diese Quote (z. B. zweite Schulung
  -- derselben Lehrkraft)? Dann ist nichts zu prüfen.
  SELECT EXISTS (
    SELECT 1 FROM public.registrations r
    WHERE r.school_id = NEW.school_id
      AND r.person_id = NEW.person_id
      AND r.role      = NEW.role
      AND r.status    = 'registered'
      AND r.id       <> NEW.id
  ) INTO v_already;

  IF v_already THEN
    RETURN NEW;
  END IF;

  -- Belegte Plätze zählen: andere Personen (NEW.person_id ausgenommen),
  -- die regulär ODER per Override angemeldet sind. Override-Anmeldungen
  -- zählen bewusst mit, da sie real einen Schulplatz einnehmen.
  SELECT COUNT(DISTINCT r.person_id) INTO v_used
  FROM public.registrations r
  WHERE r.school_id  = NEW.school_id
    AND r.role       = NEW.role
    AND r.status     = 'registered'
    AND r.person_id <> NEW.person_id
    AND r.id        <> NEW.id;

  IF v_used >= v_limit THEN
    RAISE EXCEPTION 'QUOTA_EXCEEDED: Schule hat bereits %/% Plätze (Rolle: %) belegt.',
      v_used, v_limit, NEW.role
      USING ERRCODE = 'P0001', HINT = 'school_quota';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_school_quota ON public.registrations;
CREATE TRIGGER trg_enforce_school_quota
  BEFORE INSERT OR UPDATE ON public.registrations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_school_quota();

-- ── 5. Row Level Security ────────────────────────────────────
-- Lesen: nur admin + schulungsteam. Schreiben: ausschließlich über
-- das Backend mit Service-Role-Key (umgeht RLS) – es gibt bewusst
-- KEINE Insert/Update/Delete-Policies für authenticated.
ALTER TABLE public.training_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.persons          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_batches   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_conflicts ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'training_events', 'schools', 'persons',
    'registrations', 'import_batches', 'import_conflicts'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = t AND policyname = 'Schulungsteam: Lesen'
    ) THEN
      EXECUTE format(
        $policy$
          CREATE POLICY "Schulungsteam: Lesen"
            ON public.%I FOR SELECT
            TO authenticated
            USING (public.has_schulungen_access());
        $policy$, t
      );
    END IF;
  END LOOP;
END $$;

-- ── 6. Quoten-Übersicht als View ─────────────────────────────
-- security_invoker: die RLS-Policies der Basistabellen gelten weiter.
CREATE OR REPLACE VIEW public.school_quota_usage
WITH (security_invoker = true) AS
SELECT
  s.id   AS school_id,
  s.name,
  s.city,
  s.plz,
  COUNT(DISTINCT r.person_id) FILTER (
    WHERE r.role = 'teacher' AND r.status = 'registered'
  ) AS teachers_used,
  COUNT(DISTINCT r.person_id) FILTER (
    WHERE r.role = 'leadership' AND r.status = 'registered'
  ) AS leadership_used,
  2 AS teacher_limit,
  1 AS leadership_limit
FROM public.schools s
LEFT JOIN public.registrations r ON r.school_id = s.id
GROUP BY s.id, s.name, s.city, s.plz;

-- ── 7. Seed: alle 15 KOS-Fortbildungstermine ─────────────────
-- Quelle: https://www.digiki-os.de/fuer-schulen#kos-fortbildungen
-- (src/data/project.ts). Neue Termine können später einfach per
-- weiterem INSERT oder über einen Import ergänzt werden.
INSERT INTO public.training_events
  (kurs_nr, nlc_event_id, title, audience, start_date, anmeldung_url)
VALUES
  -- Schulleitungen
  ('KOS.2638.166', '55355', 'DigiKI-Schulung für Schulleitungen', 'leadership', '2026-09-14', 'https://nlc.info/app/edb/event/55355'),
  ('KOS.2639.169', '55356', 'DigiKI-Schulung für Schulleitungen', 'leadership', '2026-09-22', 'https://nlc.info/app/edb/event/55356'),
  ('KOS.2645.172', '55357', 'DigiKI-Schulung für Schulleitungen', 'leadership', '2026-11-02', 'https://nlc.info/app/edb/event/55357'),
  ('KOS.2646.175', '55358', 'DigiKI-Schulung für Schulleitungen', 'leadership', '2026-11-10', 'https://nlc.info/app/edb/event/55358'),
  ('KOS.2648.178', '55361', 'DigiKI-Schulung für Schulleitungen', 'leadership', '2026-11-23', 'https://nlc.info/app/edb/event/55361'),
  -- Lehrkräfte
  ('KOS.2637.164', '55362', 'DigiKI-Schulung für Lehrkräfte', 'teacher', '2026-09-07', 'https://nlc.info/app/edb/event/55362'),
  ('KOS.2637.165', '55363', 'DigiKI-Schulung für Lehrkräfte', 'teacher', '2026-09-08', 'https://nlc.info/app/edb/event/55363'),
  ('KOS.2638.167', '55364', 'DigiKI-Schulung für Lehrkräfte', 'teacher', '2026-09-15', 'https://nlc.info/app/edb/event/55364'),
  ('KOS.2639.168', '55365', 'DigiKI-Schulung für Lehrkräfte', 'teacher', '2026-09-21', 'https://nlc.info/app/edb/event/55365'),
  ('KOS.2644.170', '55367', 'DigiKI-Schulung für Lehrkräfte', 'teacher', '2026-10-26', 'https://nlc.info/app/edb/event/55367'),
  ('KOS.2644.171', '55368', 'DigiKI-Schulung für Lehrkräfte', 'teacher', '2026-10-27', 'https://nlc.info/app/edb/event/55368'),
  ('KOS.2645.173', '55370', 'DigiKI-Schulung für Lehrkräfte', 'teacher', '2026-11-03', 'https://nlc.info/app/edb/event/55370'),
  ('KOS.2646.174', '55371', 'DigiKI-Schulung für Lehrkräfte', 'teacher', '2026-11-09', 'https://nlc.info/app/edb/event/55371'),
  ('KOS.2647.176', '55372', 'DigiKI-Schulung für Lehrkräfte', 'teacher', '2026-11-16', 'https://nlc.info/app/edb/event/55372'),
  ('KOS.2647.177', '55373', 'DigiKI-Schulung für Lehrkräfte', 'teacher', '2026-11-17', 'https://nlc.info/app/edb/event/55373')
ON CONFLICT (kurs_nr) DO NOTHING;
