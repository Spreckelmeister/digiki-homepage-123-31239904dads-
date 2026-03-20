-- ============================================================
-- Migration 009: updated_at-Spalte + eigene RPC für Bestandsaufnahme
-- Fügt updated_at zu bestandsaufnahme_responses hinzu (wird von
-- get_my_submissions_full benötigt) und erstellt eine einfachere
-- RPC-Funktion für die MyBestandsaufnahme-Komponente.
-- Ausführen im Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- updated_at-Spalte nachrüsten (falls noch nicht vorhanden)
ALTER TABLE public.bestandsaufnahme_responses
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE OR REPLACE FUNCTION public.get_my_bestandsaufnahme()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_email TEXT;
  result JSON;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Nicht authentifiziert';
  END IF;

  SELECT lower(u.email) INTO current_user_email
  FROM auth.users u WHERE u.id = auth.uid();

  SELECT row_to_json(br.*)
  INTO result
  FROM public.bestandsaufnahme_responses br
  WHERE br.user_id = auth.uid()
     OR lower(br.contact_email) = current_user_email
  ORDER BY br.created_at DESC
  LIMIT 1;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_bestandsaufnahme() TO authenticated;
