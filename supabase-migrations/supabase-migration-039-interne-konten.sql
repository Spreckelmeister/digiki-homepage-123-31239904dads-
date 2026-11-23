-- ============================================================
-- Migration 039: Interne Konten
-- ============================================================
-- Manche Konten mit der Rolle „Schulkonto" gehören gar keiner
-- Schule, sondern dem Team (Zweit- und Testkonten von Admins,
-- Schulungspersonal). Ohne Bestandsaufnahme tauchen sie sonst
-- unter Admin › Schulungsmaterial als „Schulen nur mit
-- Schulungsmaterial" und im Rundmail-Filter auf.
--
-- Admins markieren solche Konten dort als „intern". Die Markierung
-- blendet das Konto nur aus diesen Übersichten aus – an Rolle und
-- Rechten des Kontos ändert sie nichts.
--
-- Ohne diese Migration fehlt nur der Knopf „Internes Konto".
-- Setzt Migration 036 voraus. Wiederholbar.
-- Ausführen im Supabase SQL Editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.internal_accounts (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.internal_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin: Voller Zugriff" ON public.internal_accounts;
CREATE POLICY "Admin: Voller Zugriff"
  ON public.internal_accounts FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role::text = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role::text = 'admin')
  );

DROP POLICY IF EXISTS "Admins nur mit 2FA" ON public.internal_accounts;
CREATE POLICY "Admins nur mit 2FA"
  ON public.internal_accounts AS RESTRICTIVE FOR ALL
  TO authenticated
  USING (NOT (SELECT public.current_user_needs_mfa()))
  WITH CHECK (NOT (SELECT public.current_user_needs_mfa()));
