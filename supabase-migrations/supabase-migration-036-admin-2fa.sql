-- ============================================================
-- Migration 036: Zwei-Faktor-Pflicht für Admins
-- ============================================================
-- Admins brauchen nach der normalen Anmeldung (E-Mail-Code oder
-- Passwort) einen zweiten Faktor: Authenticator-App (TOTP) oder
-- Passkey (WebAuthn). Erst dann hat die Sitzung die Stufe „aal2“.
--
-- Durchgesetzt wird das HIER in der Datenbank, nicht nur in der
-- Middleware: Jede Tabelle mit RLS bekommt eine RESTRICTIVE Policy,
-- die einem Admin ohne aal2 jeden Zugriff verweigert – auch auf das
-- eigene Profil. Dadurch schlagen alle Rollenprüfungen in Seiten und
-- API-Routen (die die Rolle mit der Nutzer-Sitzung lesen) für einen
-- Admin ohne zweiten Faktor automatisch fehl. Normale Nutzer und das
-- Schulungsteam sind nicht betroffen.
--
-- Die Middleware fragt über current_user_needs_mfa() ab, ob sie auf
-- /best-practice/zwei-faktor umleiten muss.
--
-- REIHENFOLGE: Erst den zugehörigen Code deployen, DANN diese
-- Migration im Supabase SQL Editor ausführen (sonst fehlt Admins bis
-- zum Deploy die 2FA-Seite).
--
-- Neue Tabellen mit RLS brauchen die Policy ebenfalls – dafür diese
-- Migration einfach erneut ausführen (sie ist wiederholbar).
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_user_needs_mfa()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
           SELECT 1 FROM public.profiles
           WHERE id = auth.uid() AND lower(role::text) = 'admin'
         )
     AND coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2';
$$;

REVOKE ALL ON FUNCTION public.current_user_needs_mfa() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_needs_mfa() TO authenticated;

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT schemaname, tablename FROM pg_tables
    WHERE schemaname = 'public' AND rowsecurity
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Admins nur mit 2FA" ON %I.%I', t.schemaname, t.tablename);
    EXECUTE format(
      'CREATE POLICY "Admins nur mit 2FA" ON %I.%I AS RESTRICTIVE FOR ALL TO authenticated '
      'USING (NOT (SELECT public.current_user_needs_mfa())) '
      'WITH CHECK (NOT (SELECT public.current_user_needs_mfa()))',
      t.schemaname, t.tablename
    );
    RAISE NOTICE '2FA-Policy gesetzt: %.%', t.schemaname, t.tablename;
  END LOOP;

  -- Tabellen OHNE RLS werden nicht geschützt – zur Kontrolle auflisten.
  FOR t IN
    SELECT schemaname, tablename FROM pg_tables
    WHERE schemaname = 'public' AND NOT rowsecurity
  LOOP
    RAISE WARNING 'Tabelle ohne RLS (keine 2FA-Policy): %.%', t.schemaname, t.tablename;
  END LOOP;
END $$;
