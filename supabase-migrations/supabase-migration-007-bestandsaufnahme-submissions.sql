-- ============================================================
-- Migration 007: Bestandsaufnahme in Statusabfrage einbinden
-- Aktualisiert beide RPC-Funktionen aus Migration 005.
-- Ausführen im Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- ── 1. Basis-Funktion erweitern (anonyme Statusabfrage) ──────
CREATE OR REPLACE FUNCTION public.get_submissions_by_email(search_email TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF search_email IS NULL OR length(trim(search_email)) < 5 OR
     search_email NOT LIKE '%@%' THEN
    RAISE EXCEPTION 'Ungültige E-Mail-Adresse';
  END IF;

  RETURN (
    SELECT json_build_object(
      'best_practices', (
        SELECT COALESCE(json_agg(
          json_build_object(
            'id',          bp.id,
            'title',       bp.title,
            'school_name', bp.school_name,
            'published',   bp.published,
            'created_at',  bp.created_at
          ) ORDER BY bp.created_at DESC
        ), '[]'::json)
        FROM public.best_practices bp
        WHERE lower(bp.contact_email) = lower(trim(search_email))
           OR (bp.author_id IS NOT NULL AND EXISTS (
             SELECT 1 FROM auth.users u
             WHERE u.id = bp.author_id AND lower(u.email) = lower(trim(search_email))
           ))
      ),
      'student_apps', (
        SELECT COALESCE(json_agg(
          json_build_object(
            'id',          sa.id,
            'school_name', sa.school_name,
            'status',      sa.status,
            'created_at',  sa.created_at
          ) ORDER BY sa.created_at DESC
        ), '[]'::json)
        FROM public.applications_student_assistants sa
        WHERE lower(sa.email) = lower(trim(search_email))
      ),
      'tool_apps', (
        SELECT COALESCE(json_agg(
          json_build_object(
            'id',          ta.id,
            'school_name', ta.school_name,
            'status',      ta.status,
            'created_at',  ta.created_at
          ) ORDER BY ta.created_at DESC
        ), '[]'::json)
        FROM public.applications_tool_licenses ta
        WHERE lower(ta.email) = lower(trim(search_email))
      ),
      'bestandsaufnahme', (
        SELECT COALESCE(json_agg(
          json_build_object(
            'id',          br.id,
            'school_name', br.school_name,
            'status',      br.status,
            'created_at',  br.created_at
          ) ORDER BY br.created_at DESC
        ), '[]'::json)
        FROM public.bestandsaufnahme_responses br
        WHERE lower(br.contact_email) = lower(trim(search_email))
           OR (br.user_id IS NOT NULL AND EXISTS (
             SELECT 1 FROM auth.users u
             WHERE u.id = br.user_id AND lower(u.email) = lower(trim(search_email))
           ))
      )
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_submissions_by_email(TEXT) TO authenticated;


-- ── 2. Voll-Funktion erweitern (eingeloggte Nutzer) ──────────
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
            'contact_person',            sa.contact_person,
            'status',                    sa.status,
            'admin_notes',               sa.admin_notes,
            'start_date',                sa.start_date,
            'duration',                  sa.duration,
            'hours_per_week',            sa.hours_per_week,
            'support_technical_setup',   sa.support_technical_setup,
            'support_onboarding',        sa.support_onboarding,
            'support_tech_support',      sa.support_tech_support,
            'support_material_creation', sa.support_material_creation,
            'support_classroom',         sa.support_classroom,
            'support_other',             sa.support_other,
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
            'id',                ta.id,
            'school_name',       ta.school_name,
            'contact_person',    ta.contact_person,
            'status',            ta.status,
            'admin_notes',       ta.admin_notes,
            'grade_levels',      ta.grade_levels,
            'subjects',          ta.subjects,
            'start_date',        ta.start_date,
            'usage_description', ta.usage_description,
            'tool_selections',   ta.tool_selections,
            'created_at',        ta.created_at,
            'updated_at',        ta.updated_at
          ) ORDER BY ta.created_at DESC
        ), '[]'::json)
        FROM public.applications_tool_licenses ta
        WHERE lower(ta.email) = current_user_email
      ),
      'bestandsaufnahme', (
        SELECT COALESCE(json_agg(
          json_build_object(
            -- Kontakt
            'id',                    br.id,
            'contact_person',        br.contact_person,
            'principal_name',        br.principal_name,
            'contact_email',         br.contact_email,
            'contact_phone',         br.contact_phone,
            -- Teil A
            'school_name',           br.school_name,
            'school_location',       br.school_location,
            'student_count',         br.student_count,
            'teacher_count',         br.teacher_count,
            'is_startchancen_school',br.is_startchancen_school,
            'daz_share',             br.daz_share,
            'respondent_role',       br.respondent_role,
            -- Teil B
            'devices',               br.devices,
            'devices_other',         br.devices_other,
            'tablet_count',          br.tablet_count,
            'wlan_rating',           br.wlan_rating,
            'infrastructure',        br.infrastructure,
            'infrastructure_other',  br.infrastructure_other,
            'challenges',            br.challenges,
            'challenges_other',      br.challenges_other,
            'support_satisfaction',  br.support_satisfaction,
            -- Teil C
            'digitization_level',    br.digitization_level,
            'tools_used',            br.tools_used,
            'tools_used_other',      br.tools_used_other,
            'usage_frequency',       br.usage_frequency,
            'diagnostic_tools',      br.diagnostic_tools,
            'media_concept',         br.media_concept,
            'media_responsible',     br.media_responsible,
            -- Teil D
            'ai_usage',              br.ai_usage,
            'ai_purposes',           br.ai_purposes,
            'ai_tools_used',         br.ai_tools_used,
            'ai_tools_other',        br.ai_tools_other,
            'ai_competence',         br.ai_competence,
            'ai_concerns',           br.ai_concerns,
            'ai_concerns_other',     br.ai_concerns_other,
            'ai_trainings',          br.ai_trainings,
            'ai_trainings_other',    br.ai_trainings_other,
            -- Teil E
            'training_needs',        br.training_needs,
            'training_format',       br.training_format,
            'training_times',        br.training_times,
            'participation_count',   br.participation_count,
            'pioneer_interest',      br.pioneer_interest,
            -- Teil F
            'has_best_practice',     br.has_best_practice,
            'best_practice_description', br.best_practice_description,
            'share_practice',        br.share_practice,
            -- Teil G
            'support_needs',         br.support_needs,
            'software_licenses',     br.software_licenses,
            'software_licenses_other', br.software_licenses_other,
            'student_support',       br.student_support,
            'time_for_tools',        br.time_for_tools,
            -- Teil H
            'project_wishes',        br.project_wishes,
            'additional_notes',      br.additional_notes,
            -- Admin
            'status',                br.status,
            'admin_notes',           br.admin_notes,
            'created_at',            br.created_at,
            'updated_at',            br.updated_at
          ) ORDER BY br.created_at DESC
        ), '[]'::json)
        FROM public.bestandsaufnahme_responses br
        WHERE lower(br.contact_email) = current_user_email
           OR br.user_id = auth.uid()
      )
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_submissions_full() TO authenticated;
