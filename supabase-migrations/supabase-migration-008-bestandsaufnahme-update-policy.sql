-- ============================================================
-- Migration 008: UPDATE-RLS-Policy für Bestandsaufnahme
-- Erlaubt authentifizierten Nutzern, ihre eigene Bestandsaufnahme
-- zu bearbeiten (WHERE user_id = auth.uid()).
-- Ausführen im Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

DO $outer$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'bestandsaufnahme_responses'
      AND policyname = 'Nutzer: Eigene Bestandsaufnahme aktualisieren'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Nutzer: Eigene Bestandsaufnahme aktualisieren"
      ON public.bestandsaufnahme_responses
      FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid())
    $policy$;
  END IF;
END
$outer$;
