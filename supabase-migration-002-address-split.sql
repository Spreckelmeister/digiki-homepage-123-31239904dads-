-- ============================================================
-- DigiKI: Migration 002 – Adressfelder aufteilen
-- Ausführen im Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. applications_student_assistants: Neue Spalten hinzufügen
-- ============================================================
ALTER TABLE applications_student_assistants
  ADD COLUMN school_street TEXT NOT NULL DEFAULT '',
  ADD COLUMN school_plz TEXT NOT NULL DEFAULT '',
  ADD COLUMN school_city TEXT NOT NULL DEFAULT '';

-- Bestehende Daten migrieren (Best-Effort-Split von "Straße, PLZ Ort")
UPDATE applications_student_assistants
SET
  school_street = CASE
    WHEN school_address LIKE '%,%' THEN TRIM(split_part(school_address, ',', 1))
    ELSE school_address
  END,
  school_plz = COALESCE(
    TRIM((regexp_match(
      CASE WHEN school_address LIKE '%,%' THEN TRIM(split_part(school_address, ',', 2)) ELSE '' END,
      '(\d{5})'
    ))[1]),
    ''
  ),
  school_city = TRIM(
    regexp_replace(
      CASE WHEN school_address LIKE '%,%' THEN TRIM(split_part(school_address, ',', 2)) ELSE '' END,
      '\d{5}\s*', ''
    )
  )
WHERE school_address IS NOT NULL AND school_address != '';

-- Alte Spalte entfernen
ALTER TABLE applications_student_assistants
  DROP COLUMN school_address;


-- 2. applications_tool_licenses: Neue Spalten hinzufügen
-- ============================================================
ALTER TABLE applications_tool_licenses
  ADD COLUMN school_street TEXT NOT NULL DEFAULT '',
  ADD COLUMN school_plz TEXT NOT NULL DEFAULT '',
  ADD COLUMN school_city TEXT NOT NULL DEFAULT '';

-- Bestehende Daten migrieren
UPDATE applications_tool_licenses
SET
  school_street = CASE
    WHEN school_address LIKE '%,%' THEN TRIM(split_part(school_address, ',', 1))
    ELSE school_address
  END,
  school_plz = COALESCE(
    TRIM((regexp_match(
      CASE WHEN school_address LIKE '%,%' THEN TRIM(split_part(school_address, ',', 2)) ELSE '' END,
      '(\d{5})'
    ))[1]),
    ''
  ),
  school_city = TRIM(
    regexp_replace(
      CASE WHEN school_address LIKE '%,%' THEN TRIM(split_part(school_address, ',', 2)) ELSE '' END,
      '\d{5}\s*', ''
    )
  )
WHERE school_address IS NOT NULL AND school_address != '';

-- Alte Spalte entfernen
ALTER TABLE applications_tool_licenses
  DROP COLUMN school_address;
