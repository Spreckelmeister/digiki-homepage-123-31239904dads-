-- ============================================================
-- DigiKI: Migration 005 – E-Mail-basierte Statusabfrage
-- Ermöglicht anonymen Nutzern, eigene Einreichungen per
-- E-Mail-Adresse abzufragen ohne Login.
-- Eingeloggte Nutzer sehen volle Details zu IHREN Einreichungen.
-- Ausführen im Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- ── 1. Basis-Funktion: Anonyme Statusabfrage ─────────────────
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
              'id',          bp.id,
              'title',       bp.title,
              'school_name', bp.school_name,
              'published',   bp.published,
              'created_at',  bp.created_at
            )
            ORDER BY bp.created_at DESC
          ),
          '[]'::json
        )
        FROM public.best_practices bp
        WHERE lower(bp.contact_email) = lower(trim(search_email))
           OR (
             bp.author_id IS NOT NULL
             AND EXISTS (
               SELECT 1 FROM auth.users u
               WHERE u.id = bp.author_id
                 AND lower(u.email) = lower(trim(search_email))
             )
           )
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
        WHERE lower(sa.email) = lower(trim(search_email))
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
        WHERE lower(ta.email) = lower(trim(search_email))
      )
    )
  );
END;
$$;

-- Nur authentifizierte Nutzer können Einreichungen nachschlagen
-- (die Datenbank-Seite erfordert Login; anonymer Zugriff ist nicht nötig)
GRANT EXECUTE ON FUNCTION public.get_submissions_by_email(TEXT) TO authenticated;


-- ── 2. Voll-Funktion: Nur für eingeloggte Nutzer ─────────────
-- Liest die E-Mail aus der Session (auth.uid()) – kein Parameter nötig.
-- Gibt alle Detail-Felder inkl. Admin-Notizen zurück.
CREATE OR REPLACE FUNCTION public.get_my_submissions_full()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_email TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Nicht authentifiziert';
  END IF;

  SELECT lower(u.email) INTO current_user_email
  FROM auth.users u
  WHERE u.id = auth.uid();

  IF current_user_email IS NULL THEN
    RAISE EXCEPTION 'Nutzer nicht gefunden';
  END IF;

  RETURN (
    SELECT json_build_object(
      'email', current_user_email,
      'best_practices', (
        SELECT COALESCE(
          json_agg(
            json_build_object(
              'id',             bp.id,
              'title',          bp.title,
              'school_name',    bp.school_name,
              'subject',        bp.subject,
              'grade_level',    bp.grade_level,
              'tools_used',     bp.tools_used,
              'contact_person', bp.contact_person,
              'published',      bp.published,
              'created_at',     bp.created_at,
              'updated_at',     bp.updated_at
            )
            ORDER BY bp.created_at DESC
          ),
          '[]'::json
        )
        FROM public.best_practices bp
        WHERE lower(bp.contact_email) = current_user_email
           OR (bp.author_id IS NOT NULL AND bp.author_id = auth.uid())
      ),
      'student_apps', (
        SELECT COALESCE(
          json_agg(
            json_build_object(
              'id',                       sa.id,
              'school_name',              sa.school_name,
              'contact_person',           sa.contact_person,
              'status',                   sa.status,
              'admin_notes',              sa.admin_notes,
              'start_date',               sa.start_date,
              'duration',                 sa.duration,
              'hours_per_week',           sa.hours_per_week,
              'support_technical_setup',  sa.support_technical_setup,
              'support_onboarding',       sa.support_onboarding,
              'support_tech_support',     sa.support_tech_support,
              'support_material_creation',sa.support_material_creation,
              'support_classroom',        sa.support_classroom,
              'support_other',            sa.support_other,
              'created_at',               sa.created_at,
              'updated_at',               sa.updated_at
            )
            ORDER BY sa.created_at DESC
          ),
          '[]'::json
        )
        FROM public.applications_student_assistants sa
        WHERE lower(sa.email) = current_user_email
      ),
      'tool_apps', (
        SELECT COALESCE(
          json_agg(
            json_build_object(
              'id',               ta.id,
              'school_name',      ta.school_name,
              'contact_person',   ta.contact_person,
              'status',           ta.status,
              'admin_notes',      ta.admin_notes,
              'grade_levels',     ta.grade_levels,
              'subjects',         ta.subjects,
              'start_date',       ta.start_date,
              'usage_description',ta.usage_description,
              'tool_selections',  ta.tool_selections,
              'created_at',       ta.created_at,
              'updated_at',       ta.updated_at
            )
            ORDER BY ta.created_at DESC
          ),
          '[]'::json
        )
        FROM public.applications_tool_licenses ta
        WHERE lower(ta.email) = current_user_email
      )
    )
  );
END;
$$;

-- Nur authentifizierte Nutzer dürfen die Voll-Funktion aufrufen
GRANT EXECUTE ON FUNCTION public.get_my_submissions_full() TO authenticated;
