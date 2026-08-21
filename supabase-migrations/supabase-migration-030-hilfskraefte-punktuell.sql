-- ============================================================
-- Migration 030: Hilfskräfte-Antrag – punktuelle Unterstützung
-- Neues Antragsmodell: Schulungsanmeldung (automatisch aus den
-- Schulungsdashboard-Daten ermittelt) + schulinterner Versuch als
-- Voraussetzung, EINE konkrete Hürde statt Wunschliste, fester
-- Umfang (Einzeltermin / 2–3 Termine) statt Freitext-Dauer.
-- Alle Alt-Spalten bleiben für Bestandsanträge erhalten.
-- WICHTIG: Vor dem Code-Deploy ausführen (neue Inserts schreiben
-- die neuen Spalten). Ausführen im Supabase SQL Editor.
-- ============================================================

-- 1. Neue Spalten (alle nullable – Alt-Anträge bleiben gültig)
ALTER TABLE public.applications_student_assistants
  -- automatisch abgeleitet: 'teilgenommen' wenn mind. eine Schulung
  -- bereits stattgefunden hat, sonst 'angemeldet'
  ADD COLUMN IF NOT EXISTS training_participation TEXT
    CHECK (training_participation IS NULL
           OR training_participation IN ('teilgenommen', 'angemeldet')),
  -- automatischer Schnappschuss der bei Antragstellung angezeigten
  -- Schulungsanmeldungen (Titel + Datum + Anzahl je Rolle)
  ADD COLUMN IF NOT EXISTS training_details TEXT,
  -- Pflichtangabe: Was wurde schulintern bereits versucht?
  ADD COLUMN IF NOT EXISTS internal_attempt TEXT,
  -- EINE konkrete Hürde statt Mehrfachauswahl
  ADD COLUMN IF NOT EXISTS support_area TEXT
    CHECK (support_area IS NULL
           OR support_area IN ('technische_einrichtung', 'technisches_problem',
                               'materialerstellung', 'sonstiges')),
  -- fester Umfang statt Freitext-Dauer/Wochenstunden
  ADD COLUMN IF NOT EXISTS scope_preset TEXT
    CHECK (scope_preset IS NULL
           OR scope_preset IN ('einzeltermin', 'zwei_bis_drei_termine'));

-- 2. get_my_submissions_full um die neuen Felder erweitern
--    (identisch zu Migration 011, nur student_apps ergänzt –
--    sonst verliert der Bearbeiten-Modus die neuen Werte)
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
  FROM auth.users u WHERE u.id = auth.uid();

  IF current_user_email IS NULL THEN
    RAISE EXCEPTION 'Nutzer nicht gefunden';
  END IF;

  RETURN (
    SELECT json_build_object(
      'email', current_user_email,
      'best_practices', (
        SELECT COALESCE(json_agg(
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
          ) ORDER BY bp.created_at DESC
        ), '[]'::json)
        FROM public.best_practices bp
        WHERE lower(bp.contact_email) = current_user_email
           OR (bp.author_id IS NOT NULL AND bp.author_id = auth.uid())
      ),
      'student_apps', (
        SELECT COALESCE(json_agg(
          json_build_object(
            'id',                        sa.id,
            'school_name',               sa.school_name,
            'school_street',             sa.school_street,
            'school_plz',                sa.school_plz,
            'school_city',               sa.school_city,
            'principal_name',            sa.principal_name,
            'contact_person',            sa.contact_person,
            'phone',                     sa.phone,
            'email',                     sa.email,
            'teacher_count',             sa.teacher_count,
            'student_count',             sa.student_count,
            'support_technical_setup',   sa.support_technical_setup,
            'support_onboarding',        sa.support_onboarding,
            'support_tech_support',      sa.support_tech_support,
            'support_material_creation', sa.support_material_creation,
            'support_classroom',         sa.support_classroom,
            'support_other',             sa.support_other,
            'support_explanation',       sa.support_explanation,
            'training_participation',    sa.training_participation,
            'training_details',          sa.training_details,
            'internal_attempt',          sa.internal_attempt,
            'support_area',              sa.support_area,
            'scope_preset',              sa.scope_preset,
            'start_date',                sa.start_date,
            'duration',                  sa.duration,
            'hours_per_week',            sa.hours_per_week,
            'preferred_days',            sa.preferred_days,
            'has_wifi',                  sa.has_wifi,
            'has_devices',               sa.has_devices,
            'device_count',              sa.device_count,
            'has_interactive_displays',  sa.has_interactive_displays,
            'has_school_server',         sa.has_school_server,
            'status',                    sa.status,
            'admin_notes',               sa.admin_notes,
            'created_at',                sa.created_at,
            'updated_at',                sa.updated_at
          ) ORDER BY sa.created_at DESC
        ), '[]'::json)
        FROM public.applications_student_assistants sa
        WHERE lower(sa.email) = current_user_email
      ),
      'tool_apps', (
        SELECT COALESCE(json_agg(
          json_build_object(
            'id',                                   ta.id,
            'school_name',                          ta.school_name,
            'school_street',                        ta.school_street,
            'school_plz',                           ta.school_plz,
            'school_city',                          ta.school_city,
            'principal_name',                       ta.principal_name,
            'contact_person',                       ta.contact_person,
            'phone',                                ta.phone,
            'email',                                ta.email,
            'teacher_count',                        ta.teacher_count,
            'student_count',                        ta.student_count,
            'tool_selections',                      ta.tool_selections,
            'additional_tools',                     ta.additional_tools,
            'grade_levels',                         ta.grade_levels,
            'subjects',                             ta.subjects,
            'start_date',                           ta.start_date,
            'usage_description',                    ta.usage_description,
            'privacy_concept_exists',               ta.privacy_concept_exists,
            'parental_consent',                     ta.parental_consent,
            'it_infrastructure_meets_requirements', ta.it_infrastructure_meets_requirements,
            'status',                               ta.status,
            'admin_notes',                          ta.admin_notes,
            'created_at',                           ta.created_at,
            'updated_at',                           ta.updated_at
          ) ORDER BY ta.created_at DESC
        ), '[]'::json)
        FROM public.applications_tool_licenses ta
        WHERE lower(ta.email) = current_user_email
      )
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_submissions_full() TO authenticated;
