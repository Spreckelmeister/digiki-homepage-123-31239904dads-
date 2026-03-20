-- ============================================================
-- Migration 006: Account-Registrierung über Bestandsaufnahme
-- Ausführen im Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Neue Spalten in bestandsaufnahme_responses
-- ============================================================
ALTER TABLE bestandsaufnahme_responses
  ADD COLUMN IF NOT EXISTS contact_person  TEXT,
  ADD COLUMN IF NOT EXISTS principal_name  TEXT,
  ADD COLUMN IF NOT EXISTS contact_email   TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone   TEXT,
  ADD COLUMN IF NOT EXISTS user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Neue Spalten in profiles
-- ============================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone          TEXT,
  ADD COLUMN IF NOT EXISTS principal_name TEXT;

-- 3. Policies für bestandsaufnahme_responses und profiles
-- (CREATE POLICY unterstützt kein IF NOT EXISTS → DO-Block)
-- ============================================================
DO $$
BEGIN
  -- Authentifizierte Nutzer dürfen ihre eigene Bestandsaufnahme-Antwort lesen
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'bestandsaufnahme_responses'
      AND policyname = 'Nutzer: Eigene Bestandsaufnahme lesen'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Nutzer: Eigene Bestandsaufnahme lesen"
        ON bestandsaufnahme_responses FOR SELECT
        TO authenticated
        USING (user_id = auth.uid());
    $policy$;
  END IF;

  -- Nutzer dürfen ihr eigenes Profil lesen
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'Nutzer: Eigenes Profil lesen'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Nutzer: Eigenes Profil lesen"
        ON profiles FOR SELECT
        TO authenticated
        USING (id = auth.uid());
    $policy$;
  END IF;

  -- Nutzer dürfen ihr eigenes Profil anlegen
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'Nutzer: Eigenes Profil anlegen'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Nutzer: Eigenes Profil anlegen"
        ON profiles FOR INSERT
        TO authenticated
        WITH CHECK (id = auth.uid());
    $policy$;
  END IF;

  -- Nutzer dürfen ihr eigenes Profil aktualisieren
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'Nutzer: Eigenes Profil aktualisieren'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Nutzer: Eigenes Profil aktualisieren"
        ON profiles FOR UPDATE
        TO authenticated
        USING (id = auth.uid())
        WITH CHECK (id = auth.uid());
    $policy$;
  END IF;
END $$;
