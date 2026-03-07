-- ============================================================
-- DigiKI: Migration 005 – E-Mail-basierte Statusabfrage
-- Ermöglicht anonymen Nutzern, eigene Einreichungen per
-- E-Mail-Adresse abzufragen ohne Login.
-- Ausführen im Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Datenbankfunktion mit SECURITY DEFINER (umgeht RLS sicher)
-- Gibt nur nicht-sensible Felder zurück (kein Telefon, keine Adressen)
CREATE OR REPLACE FUNCTION public.get_submissions_by_email(search_email TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Einfache E-Mail-Validierung
  IF search_email IS NULL OR length(trim(search_email)) < 5 OR
     search_email NOT LIKE '%@%' THEN
    RAISE EXCEPTION 'Ungültige E-Mail-Adresse';
  END IF;

  RETURN (
    SELECT json_build_object(
      'best_practices', (
        SELECT COALESCE(
          json_agg(
            json_build_object(
              'id',         bp.id,
              'title',      bp.title,
              'school_name', bp.school_name,
              'published',  bp.published,
              'created_at', bp.created_at
            )
            ORDER BY bp.created_at DESC
          ),
          '[]'::json
        )
        FROM public.best_practices bp
        WHERE bp.contact_email = trim(search_email)
      ),
      'student_apps', (
        SELECT COALESCE(
          json_agg(
            json_build_object(
              'id',          sa.id,
              'school_name', sa.school_name,
              'status',      sa.status,
              'created_at',  sa.created_at
            )
            ORDER BY sa.created_at DESC
          ),
          '[]'::json
        )
        FROM public.applications_student_assistants sa
        WHERE sa.email = trim(search_email)
      ),
      'tool_apps', (
        SELECT COALESCE(
          json_agg(
            json_build_object(
              'id',          ta.id,
              'school_name', ta.school_name,
              'status',      ta.status,
              'created_at',  ta.created_at
            )
            ORDER BY ta.created_at DESC
          ),
          '[]'::json
        )
        FROM public.applications_tool_licenses ta
        WHERE ta.email = trim(search_email)
      )
    )
  );
END;
$$;

-- Anonymen und authentifizierten Nutzern Zugriff auf die Funktion geben
GRANT EXECUTE ON FUNCTION public.get_submissions_by_email(TEXT) TO anon, authenticated;
