-- ============================================================
-- Migration 032: Kontaktformular
-- ============================================================
-- Ein echtes Kontaktformular ersetzt die prominent platzierte
-- E-Mail-Adresse auf der Website. Anfragen landen in dieser
-- Tabelle und werden im Admin-Bereich (Tab „Kontakt") bearbeitet;
-- die absendende Person erhält eine automatische
-- Eingangsbestätigung per E-Mail.
--
-- Ausführen im Supabase SQL Editor. Muss VOR dem Deploy des
-- zugehörigen Codes laufen, sonst schlägt das Absenden des
-- Formulars fehl.
-- ============================================================

CREATE TABLE IF NOT EXISTS contact_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Absender:in
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  school_name TEXT,
  -- Inhalt
  topic TEXT,
  message TEXT NOT NULL,
  -- Admin-Workflow
  status TEXT NOT NULL DEFAULT 'neu' CHECK (status IN ('neu', 'in_bearbeitung', 'beantwortet')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;

-- Einreichen läuft ausschließlich über die Server-Route /api/kontakt
-- (Service-Role-Key, umgeht RLS) – deshalb bewusst KEINE INSERT-Policy
-- für anon/authenticated: Der Spam-Schutz (Honeypot, Rate-Limit) sitzt
-- in der Route und kann so nicht per Direktzugriff umgangen werden.

-- Admins sehen und bearbeiten alle Anfragen (Status, interne Notizen).
CREATE POLICY "Admin: Voller Zugriff"
  ON contact_requests FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );
