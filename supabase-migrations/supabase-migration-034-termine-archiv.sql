-- ============================================================
-- Migration 034: Schulungstermine archivieren statt löschen
-- ============================================================
-- Die Anmeldedaten alter Termine sind die Grundlage der
-- Schulungsprüfung in den Antragsformularen (Hilfskräfte +
-- Tool-Lizenzen) und müssen erhalten bleiben. Der Löschknopf im
-- Schulungsdashboard ARCHIVIERT deshalb Termine mit Anmeldungen
-- nur noch (archived_at gesetzt): Sie verschwinden aus Dashboard
-- und Website, Anmeldungen + Prüfung bleiben intakt. Nur Termine
-- ohne Anmeldungen werden weiterhin wirklich gelöscht.
--
-- Zusammen mit dem Deploy ausführen (der Code filtert archivierte
-- Termine in JS, bricht ohne die Spalte also nicht).
-- ============================================================

ALTER TABLE public.training_events
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
