-- ============================================================
-- Migration 012: Anträge von Admin-E-Mail-Adressen ablehnen
-- Trigger auf beiden Antrags-Tabellen, der vor INSERT prüft,
-- ob die angegebene E-Mail zu einem Admin-Account gehört.
-- Ausführen im Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Trigger-Funktion: prüft ob die E-Mail eines Antrags zu einem Admin gehört
CREATE OR REPLACE FUNCTION public.reject_admin_email_applications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  admin_count INT;
BEGIN
  SELECT COUNT(*) INTO admin_count
  FROM auth.users u
  JOIN public.profiles p ON p.id = u.id
  WHERE lower(u.email) = lower(NEW.email)
    AND p.role = 'admin';

  IF admin_count > 0 THEN
    RAISE EXCEPTION 'Anträge von Admin-Accounts sind nicht erlaubt';
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger für Studentische Hilfskräfte
DROP TRIGGER IF EXISTS reject_admin_email_on_student_app
  ON public.applications_student_assistants;

CREATE TRIGGER reject_admin_email_on_student_app
  BEFORE INSERT ON public.applications_student_assistants
  FOR EACH ROW EXECUTE FUNCTION public.reject_admin_email_applications();

-- Trigger für Tool-Lizenzen
DROP TRIGGER IF EXISTS reject_admin_email_on_tool_app
  ON public.applications_tool_licenses;

CREATE TRIGGER reject_admin_email_on_tool_app
  BEFORE INSERT ON public.applications_tool_licenses
  FOR EACH ROW EXECUTE FUNCTION public.reject_admin_email_applications();
