-- ============================================================
-- Migration 043: Fortschritt im Schulungsmaterial je Konto
-- ============================================================
-- HTML-Lerneinheiten merken sich ihren Stand (z. B. „Einheit
-- erledigt") im Speicher des Browsers. Im abgeschotteten Rahmen
-- gibt es den nicht – der Stand ging beim Schließen der Seite
-- verloren. Jetzt wird er je Konto und Material hier abgelegt und
-- beim nächsten Öffnen wieder eingesetzt, auf jedem Gerät.
--
-- Gespeichert wird nur, was die Lerneinheit selbst als Stand
-- ablegt (kleine Schlüssel/Wert-Liste, vom Server auf 32 KB
-- begrenzt). Jedes Konto sieht und ändert nur den eigenen Stand.
-- Wird das Konto oder das Material gelöscht, verschwindet der
-- Stand mit.
--
-- Setzt Migration 036 und 038 voraus. Wiederholbar.
-- Ausführen im Supabase SQL Editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.schulungsmaterial_fortschritt (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES public.schulungsmaterial(id) ON DELETE CASCADE,
  -- Schlüssel/Wert-Liste der Lerneinheit (Werte sind Text).
  daten JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, material_id),
  CONSTRAINT schulungsmaterial_fortschritt_groesse
    CHECK (jsonb_typeof(daten) = 'object' AND pg_column_size(daten) <= 65536)
);

ALTER TABLE public.schulungsmaterial_fortschritt ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Eigener Fortschritt" ON public.schulungsmaterial_fortschritt;
CREATE POLICY "Eigener Fortschritt"
  ON public.schulungsmaterial_fortschritt FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admins nur mit 2FA" ON public.schulungsmaterial_fortschritt;
CREATE POLICY "Admins nur mit 2FA"
  ON public.schulungsmaterial_fortschritt AS RESTRICTIVE FOR ALL
  TO authenticated
  USING (NOT (SELECT public.current_user_needs_mfa()))
  WITH CHECK (NOT (SELECT public.current_user_needs_mfa()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.schulungsmaterial_fortschritt TO authenticated;
