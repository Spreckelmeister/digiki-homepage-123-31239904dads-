-- ============================================================
-- Migration 044: Protokoll der Zugriffe auf Schulungsmaterial
-- ============================================================
-- Die Nutzungsbedingungen für das Schulungsmaterial sagen zu, dass
-- jeder Zugriff protokolliert wird (wer hat wann welche Unterlage
-- geöffnet) – als Nachweis bei unerlaubter Weitergabe. Hier steht
-- je Öffnen einer Unterlage eine Zeile: Konto, Unterlage, Zeitpunkt.
-- Keine IP-Adresse. Einträge älter als 90 Tage löscht der Server
-- beim Schreiben neuer Einträge.
--
-- Geschrieben wird nur vom Server (Service-Role-Key), gelesen nur
-- von Admins. Wird das Konto gelöscht, verschwinden seine Einträge.
--
-- Setzt Migration 036 und 038 voraus. Wiederholbar.
-- Ausführen im Supabase SQL Editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.schulungsmaterial_zugriffe (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  material_id UUID REFERENCES public.schulungsmaterial(id) ON DELETE SET NULL,
  -- Titel zum Zeitpunkt des Zugriffs (bleibt lesbar, wenn die Unterlage gelöscht wird).
  material_title TEXT NOT NULL DEFAULT '',
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS schulungsmaterial_zugriffe_zeit_idx
  ON public.schulungsmaterial_zugriffe (opened_at);
CREATE INDEX IF NOT EXISTS schulungsmaterial_zugriffe_konto_idx
  ON public.schulungsmaterial_zugriffe (user_id, opened_at);

ALTER TABLE public.schulungsmaterial_zugriffe ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin: Protokoll lesen" ON public.schulungsmaterial_zugriffe;
CREATE POLICY "Admin: Protokoll lesen"
  ON public.schulungsmaterial_zugriffe FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role::text = 'admin')
  );

DROP POLICY IF EXISTS "Admins nur mit 2FA" ON public.schulungsmaterial_zugriffe;
CREATE POLICY "Admins nur mit 2FA"
  ON public.schulungsmaterial_zugriffe AS RESTRICTIVE FOR ALL
  TO authenticated
  USING (NOT (SELECT public.current_user_needs_mfa()))
  WITH CHECK (NOT (SELECT public.current_user_needs_mfa()));

-- Auswertung, z. B.: Wer hat in den letzten 30 Tagen was geöffnet?
--   SELECT z.opened_at, p.full_name, p.school, z.material_title
--   FROM public.schulungsmaterial_zugriffe z
--   JOIN public.profiles p ON p.id = z.user_id
--   WHERE z.opened_at > NOW() - INTERVAL '30 days'
--   ORDER BY z.opened_at DESC;
--
-- Konto zu einer Kennung aus einer Kopie oder vom Material-Server
-- (32 Zeichen ohne Bindestriche, oder die ersten 8 Zeichen aus dem Bild):
--   SELECT id, full_name, school FROM public.profiles
--   WHERE replace(id::text, '-', '') LIKE 'KENNUNG%';
