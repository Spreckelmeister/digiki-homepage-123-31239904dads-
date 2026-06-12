-- ============================================================
-- DigiKI: SQL-Migrationen für Online-Formulare
-- Ausführen im Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Tabelle: Anträge Studentische Hilfskräfte
-- ============================================================
CREATE TABLE applications_student_assistants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Schulinfo
  school_name TEXT NOT NULL,
  school_address TEXT NOT NULL,
  principal_name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  teacher_count INTEGER,
  student_count INTEGER,
  -- Gewünschte Unterstützung (Checkboxen)
  support_technical_setup BOOLEAN DEFAULT FALSE,
  support_onboarding BOOLEAN DEFAULT FALSE,
  support_tech_support BOOLEAN DEFAULT FALSE,
  support_material_creation BOOLEAN DEFAULT FALSE,
  support_classroom BOOLEAN DEFAULT FALSE,
  support_other BOOLEAN DEFAULT FALSE,
  support_explanation TEXT,
  -- Zeitraum & Umfang
  start_date TEXT,
  duration TEXT,
  hours_per_week TEXT,
  preferred_days TEXT,
  -- Technische Voraussetzungen
  has_wifi BOOLEAN DEFAULT FALSE,
  has_devices BOOLEAN DEFAULT FALSE,
  device_count INTEGER,
  has_interactive_displays BOOLEAN DEFAULT FALSE,
  has_school_server BOOLEAN DEFAULT FALSE,
  -- Admin-Workflow
  status TEXT NOT NULL DEFAULT 'neu' CHECK (status IN ('neu', 'in_bearbeitung', 'genehmigt', 'abgelehnt')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS aktivieren
ALTER TABLE applications_student_assistants ENABLE ROW LEVEL SECURITY;

-- Anonyme können Anträge einreichen
CREATE POLICY "Öffentlich: Antrag einreichen"
  ON applications_student_assistants FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Admins können alles sehen und bearbeiten
CREATE POLICY "Admin: Voller Zugriff"
  ON applications_student_assistants FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );


-- 2. Tabelle: Anträge Tool-Lizenzen
-- ============================================================
CREATE TABLE applications_tool_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Schulinfo
  school_name TEXT NOT NULL,
  school_address TEXT NOT NULL,
  principal_name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  teacher_count INTEGER,
  student_count INTEGER,
  -- Tool-Auswahl (JSONB)
  tool_selections JSONB NOT NULL DEFAULT '[]',
  additional_tools TEXT,
  -- Geplanter Einsatz
  grade_levels TEXT,
  subjects TEXT,
  start_date TEXT,
  usage_description TEXT,
  -- Datenschutz
  privacy_concept_exists BOOLEAN DEFAULT FALSE,
  parental_consent BOOLEAN DEFAULT FALSE,
  it_infrastructure_meets_requirements BOOLEAN DEFAULT FALSE,
  -- Admin-Workflow
  status TEXT NOT NULL DEFAULT 'neu' CHECK (status IN ('neu', 'in_bearbeitung', 'genehmigt', 'abgelehnt')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS aktivieren
ALTER TABLE applications_tool_licenses ENABLE ROW LEVEL SECURITY;

-- Anonyme können Anträge einreichen
CREATE POLICY "Öffentlich: Antrag einreichen"
  ON applications_tool_licenses FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Admins können alles sehen und bearbeiten
CREATE POLICY "Admin: Voller Zugriff"
  ON applications_tool_licenses FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );


-- 3. best_practices Tabelle erweitern
-- ============================================================
ALTER TABLE best_practices
  ALTER COLUMN author_id DROP NOT NULL;

ALTER TABLE best_practices
  ADD COLUMN IF NOT EXISTS contact_person TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS vorlage_data JSONB;

-- Anonyme können unveröffentlichte Best Practices einreichen
CREATE POLICY "Öffentlich: Best Practice einreichen"
  ON best_practices FOR INSERT
  TO anon
  WITH CHECK (published = false);


-- ============================================================
-- 4. Rate Limiting (Schutz vor Spam-Einreichungen)
-- ============================================================
-- Diese Funktion begrenzt Einreichungen pro IP/Sitzung.
-- Supabase bietet kein eingebautes Rate Limiting auf Datenbank-Ebene.
--
-- EMPFOHLENE MASSNAHMEN (manuell im Supabase Dashboard konfigurieren):
--
-- a) Supabase API Rate Limits:
--    Dashboard > Project Settings > API > Rate Limiting
--    Empfohlene Werte für dieses Projekt:
--    - Requests per second: 10 (global)
--    - Burst: 20
--
-- b) Edge Function (optional, für fortgeschrittenes Rate Limiting):
--    Falls nötig, kann eine Supabase Edge Function als Proxy
--    vor die INSERT-Operationen geschaltet werden, die z.B.
--    max. 3 Einreichungen pro IP-Adresse pro Stunde erlaubt.
--
-- c) Einfache Schutzmaßnahme auf DB-Ebene:
--    Die folgende Funktion verhindert, dass die gleiche Schule
--    innerhalb von 5 Minuten doppelt einreicht.
-- ============================================================

-- Trigger: Doppelte Einreichungen für Hilfskräfte verhindern
CREATE OR REPLACE FUNCTION check_duplicate_student_assistant()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM applications_student_assistants
    WHERE email = NEW.email
    AND created_at > NOW() - INTERVAL '5 minutes'
  ) THEN
    RAISE EXCEPTION 'Bitte warten Sie einige Minuten, bevor Sie erneut einreichen.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_duplicate_student_assistant
  BEFORE INSERT ON applications_student_assistants
  FOR EACH ROW
  EXECUTE FUNCTION check_duplicate_student_assistant();

-- Trigger: Doppelte Einreichungen für Tool-Lizenzen verhindern
CREATE OR REPLACE FUNCTION check_duplicate_tool_license()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM applications_tool_licenses
    WHERE email = NEW.email
    AND created_at > NOW() - INTERVAL '5 minutes'
  ) THEN
    RAISE EXCEPTION 'Bitte warten Sie einige Minuten, bevor Sie erneut einreichen.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_duplicate_tool_license
  BEFORE INSERT ON applications_tool_licenses
  FOR EACH ROW
  EXECUTE FUNCTION check_duplicate_tool_license();

-- Trigger: Doppelte Best-Practice-Einreichungen verhindern
CREATE OR REPLACE FUNCTION check_duplicate_best_practice()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.author_id IS NULL AND EXISTS (
    SELECT 1 FROM best_practices
    WHERE contact_email = NEW.contact_email
    AND author_id IS NULL
    AND created_at > NOW() - INTERVAL '5 minutes'
  ) THEN
    RAISE EXCEPTION 'Bitte warten Sie einige Minuten, bevor Sie erneut einreichen.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_duplicate_best_practice
  BEFORE INSERT ON best_practices
  FOR EACH ROW
  EXECUTE FUNCTION check_duplicate_best_practice();
