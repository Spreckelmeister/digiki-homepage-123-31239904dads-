-- ============================================================
-- DigiKI: Migration 004 – Bestandsaufnahme-Tabelle
-- Ausführen im Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

CREATE TABLE bestandsaufnahme_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Teil A: Allgemeine Angaben
  school_name          TEXT NOT NULL,
  school_location      TEXT NOT NULL,
  student_count        TEXT NOT NULL,
  teacher_count        TEXT,
  is_startchancen_school TEXT NOT NULL,
  daz_share            TEXT NOT NULL,
  respondent_role      TEXT,
  respondent_role_other TEXT,

  -- Teil B: Technische Ausstattung
  devices              JSONB NOT NULL DEFAULT '[]',
  devices_other        TEXT,
  tablet_count         TEXT,
  wlan_rating          INTEGER CHECK (wlan_rating BETWEEN 1 AND 5),
  infrastructure       JSONB NOT NULL DEFAULT '[]',
  infrastructure_other TEXT,
  challenges           JSONB NOT NULL DEFAULT '[]',
  challenges_other     TEXT,
  support_satisfaction INTEGER CHECK (support_satisfaction BETWEEN 1 AND 5),

  -- Teil C: Aktueller Stand der Digitalisierung
  digitization_level   INTEGER CHECK (digitization_level BETWEEN 1 AND 5),
  tools_used           JSONB NOT NULL DEFAULT '[]',
  tools_used_other     TEXT,
  usage_frequency      TEXT,
  diagnostic_tools     JSONB NOT NULL DEFAULT '[]',
  diagnostic_tools_other TEXT,
  media_concept        TEXT,
  media_responsible    TEXT,

  -- Teil D: KI
  ai_usage             TEXT,
  ai_purposes          JSONB NOT NULL DEFAULT '[]',
  ai_tools_used        JSONB NOT NULL DEFAULT '[]',
  ai_tools_other       TEXT,
  ai_competence        INTEGER CHECK (ai_competence BETWEEN 1 AND 5),
  ai_concerns          JSONB NOT NULL DEFAULT '[]',
  ai_concerns_other    TEXT,
  ai_trainings         JSONB NOT NULL DEFAULT '[]',
  ai_trainings_other   TEXT,

  -- Teil E: Fortbildungsbedarf
  training_needs       JSONB NOT NULL DEFAULT '[]',
  training_format      JSONB NOT NULL DEFAULT '[]',
  training_times       JSONB NOT NULL DEFAULT '[]',
  participation_count  TEXT,
  pioneer_interest     TEXT,

  -- Teil F: Best Practices
  has_best_practice         TEXT,
  best_practice_description TEXT,
  share_practice            TEXT,

  -- Teil G: Unterstützungsbedarf
  support_needs            JSONB NOT NULL DEFAULT '[]',
  software_licenses        JSONB NOT NULL DEFAULT '[]',
  software_licenses_other  TEXT,
  student_support          TEXT,
  time_for_tools           TEXT,

  -- Teil H: Offene Rückmeldung
  project_wishes    TEXT,
  additional_notes  TEXT,

  -- Meta (Admin)
  admin_notes TEXT,
  status      TEXT NOT NULL DEFAULT 'neu' CHECK (status IN ('neu', 'gelesen', 'archiviert')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- RLS aktivieren
ALTER TABLE bestandsaufnahme_responses ENABLE ROW LEVEL SECURITY;

-- Anonyme und eingeloggte Nutzer dürfen Antworten einreichen
CREATE POLICY "Öffentlich: Antwort einreichen"
  ON bestandsaufnahme_responses FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Admins können alles lesen und verwalten
CREATE POLICY "Admin: Voller Zugriff"
  ON bestandsaufnahme_responses FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Automatisches updated_at
CREATE TRIGGER update_bestandsaufnahme_updated_at
  BEFORE UPDATE ON bestandsaufnahme_responses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
