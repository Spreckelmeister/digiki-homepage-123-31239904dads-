-- ============================================================
-- DigiKI: Migration 005 – RLS-Policy bestandsaufnahme_responses härten
--
-- Problem: Die INSERT-Policy "Öffentlich: Antwort einreichen" hat
--          WITH CHECK (true) – das erlaubt, Admin-Felder (status,
--          admin_notes) beim Einreichen beliebig zu setzen.
--
-- Lösung:  Policy ersetzen durch eine, die sicherstellt, dass
--          beim INSERT keine Admin-Felder manipuliert werden können.
--          Konkret: status muss 'neu' sein (oder NULL/DEFAULT),
--          admin_notes muss NULL sein.
--
-- Ausführen im Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Alte, zu permissive Policy entfernen
DROP POLICY IF EXISTS "Öffentlich: Antwort einreichen"
  ON public.bestandsaufnahme_responses;

-- Neue, eingeschränkte INSERT-Policy
-- Erlaubt Einreichungen, solange:
--   • status ist NULL oder 'neu'  (kein fremdes Status-Setzen)
--   • admin_notes ist NULL        (keine Admin-Notizen durch Anon)
CREATE POLICY "Öffentlich: Antwort einreichen"
  ON public.bestandsaufnahme_responses
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    (status IS NULL OR status = 'neu')
    AND admin_notes IS NULL
  );
