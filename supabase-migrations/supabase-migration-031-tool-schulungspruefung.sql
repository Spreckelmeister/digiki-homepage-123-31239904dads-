-- Migration 031: Schulungsprüfung auch für Tool-Lizenz-Anträge
-- + Constraint-Erweiterung für den Stellvertreter-Modus der Hilfskräfte.
--
-- BITTE VOR DEM DEPLOY DES ZUGEHÖRIGEN CODES AUSFÜHREN (Supabase SQL Editor):
--   • Ohne Teil 1 scheitert im Hilfskräfte-Formular das Einreichen, wenn
--     Admin/Schulungsteam die Schulungsprüfung bewusst überspringen
--     (neuer Wert 'pruefung_uebersprungen' verletzt sonst den CHECK aus
--     Migration 030).
--   • Ohne Teil 2 scheitert JEDER neue Tool-Lizenz-Antrag, sobald der neue
--     Code die Schulungs-Spalten mitschreibt.

-- ── 1. Hilfskräfte: CHECK um 'pruefung_uebersprungen' erweitern ────────────
ALTER TABLE public.applications_student_assistants
  DROP CONSTRAINT IF EXISTS applications_student_assistants_training_participation_check;

ALTER TABLE public.applications_student_assistants
  ADD CONSTRAINT applications_student_assistants_training_participation_check
    CHECK (training_participation IS NULL
           OR training_participation IN ('teilgenommen', 'angemeldet',
                                         'pruefung_uebersprungen'));

-- ── 2. Tool-Lizenzen: Schulungs-Schnappschuss wie bei den Hilfskräften ─────
--    (welche Anmeldungen lagen beim Einreichen vor bzw. wurde die Prüfung
--     im Stellvertreter-Modus bewusst übersprungen)
ALTER TABLE public.applications_tool_licenses
  ADD COLUMN IF NOT EXISTS training_participation TEXT
    CHECK (training_participation IS NULL
           OR training_participation IN ('teilgenommen', 'angemeldet',
                                         'pruefung_uebersprungen')),
  ADD COLUMN IF NOT EXISTS training_details TEXT;
