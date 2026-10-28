-- ============================================================
-- Migration 035: Weiterleitungs-Adresse für Kontaktanfragen
-- ============================================================
-- Neue Kontaktanfragen werden zusätzlich per E-Mail an das Team
-- weitergeleitet. Die Zieladresse(n) pflegen Admins selbst im
-- Admin-Bereich (Tab „Kontakt") – gespeichert als Schlüssel
-- `contact_forward_to` in der kleinen Einstellungstabelle
-- `app_settings` (kommagetrennt, leer = keine Weiterleitung).
--
-- Ohne Zeile in der Tabelle greift als Fallback die Umgebungs-
-- variable CONTACT_FORWARD_TO. Der Code bricht ohne diese
-- Migration nicht, das Eingabefeld meldet dann aber einen Fehler.
--
-- Ausführen im Supabase SQL Editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Nur Admins lesen und ändern Einstellungen. Die Server-Route
-- /api/kontakt liest mit dem Service-Role-Key (umgeht RLS).
CREATE POLICY "Admin: Voller Zugriff"
  ON public.app_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );
