-- ============================================================
-- DigiKI: Migration 022 – Dauerhafte manuelle Mail-Empfänger
-- Speichert vom Admin manuell hinzugefügte E-Mail-Adressen für das
-- Bulk-Mail-Tool, damit sie dauerhaft im Verteiler bleiben (geteilt
-- über alle Admins, nicht nur im Browser).
-- Zugriff ausschließlich über die Service-Role (Backend, admin-only).
-- Ausführen im Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.mailing_extra_recipients (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT NOT NULL,
  label      TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Eine Adresse nur einmal (case-insensitiv).
CREATE UNIQUE INDEX IF NOT EXISTS mailing_extra_recipients_email_unique
  ON public.mailing_extra_recipients (lower(email));

-- RLS aktiv, aber bewusst KEINE Policy für authenticated/anon → nur die
-- Service-Role (Backend) kann lesen/schreiben. Die API-Routen sind
-- zusätzlich admin-only abgesichert.
ALTER TABLE public.mailing_extra_recipients ENABLE ROW LEVEL SECURITY;
