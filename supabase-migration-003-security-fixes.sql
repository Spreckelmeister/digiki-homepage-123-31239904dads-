-- ============================================================
-- DigiKI: Migration 003 – Supabase Security Warnings beheben
-- Ausführen im Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Function Search Path Mutable – search_path fixieren
-- ============================================================

-- Fix: update_updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix: check_duplicate_student_assistant
CREATE OR REPLACE FUNCTION public.check_duplicate_student_assistant()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.applications_student_assistants
    WHERE email = NEW.email
    AND created_at > NOW() - INTERVAL '5 minutes'
  ) THEN
    RAISE EXCEPTION 'Bitte warten Sie einige Minuten, bevor Sie erneut einreichen.';
  END IF;
  RETURN NEW;
END;
$$;

-- Fix: check_duplicate_tool_license
CREATE OR REPLACE FUNCTION public.check_duplicate_tool_license()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.applications_tool_licenses
    WHERE email = NEW.email
    AND created_at > NOW() - INTERVAL '5 minutes'
  ) THEN
    RAISE EXCEPTION 'Bitte warten Sie einige Minuten, bevor Sie erneut einreichen.';
  END IF;
  RETURN NEW;
END;
$$;

-- Fix: check_duplicate_best_practice
CREATE OR REPLACE FUNCTION public.check_duplicate_best_practice()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.author_id IS NULL AND EXISTS (
    SELECT 1 FROM public.best_practices
    WHERE contact_email = NEW.contact_email
    AND author_id IS NULL
    AND created_at > NOW() - INTERVAL '5 minutes'
  ) THEN
    RAISE EXCEPTION 'Bitte warten Sie einige Minuten, bevor Sie erneut einreichen.';
  END IF;
  RETURN NEW;
END;
$$;


-- 2. RLS Policy Always True – INSERT-Policies restriktiver machen
-- ============================================================

-- Alte Policies entfernen
DROP POLICY IF EXISTS "Öffentlich: Antrag einreichen" ON public.applications_student_assistants;
DROP POLICY IF EXISTS "Öffentlich: Antrag einreichen" ON public.applications_tool_licenses;

-- Neue Policies: Nur Einreichungen mit Status 'neu' erlauben
CREATE POLICY "Öffentlich: Antrag einreichen"
  ON public.applications_student_assistants FOR INSERT
  TO anon, authenticated
  WITH CHECK (status = 'neu');

CREATE POLICY "Öffentlich: Antrag einreichen"
  ON public.applications_tool_licenses FOR INSERT
  TO anon, authenticated
  WITH CHECK (status = 'neu');


-- ============================================================
-- 3. MANUELLER SCHRITT: Leaked Password Protection aktivieren
-- ============================================================
-- Im Supabase Dashboard:
-- Authentication > Settings > Security > "Leaked Password Protection" einschalten
-- Dies prüft neue Passwörter gegen bekannte Datenlecks (HaveIBeenPwned).
