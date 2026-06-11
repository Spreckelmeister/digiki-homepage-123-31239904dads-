// Gemeinsame Typen für das Schulungs-Dashboard (API + UI).

export type ParticipantRole = "teacher" | "leadership";
export type RegistrationStatus = "registered" | "cancelled";
export type ConflictStatus = "open" | "rejected" | "approved";

export interface TrainingEvent {
  id: string;
  kurs_nr: string;
  nlc_event_id: string | null;
  title: string;
  audience: ParticipantRole;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
  anmeldung_url: string | null;
  /** Anzahl aktiver Anmeldungen (nur in der Overview-Antwort gefüllt). */
  registration_count?: number;
}

export interface SchoolQuotaUsage {
  school_id: string;
  name: string;
  city: string | null;
  plz: string | null;
  teachers_used: number;
  leadership_used: number;
  teacher_limit: number;
  leadership_limit: number;
}

/**
 * Teilnahmeberechtigte Schule (aus der Bestandsaufnahme) inkl.
 * Anmeldestatus. school_id ist null, wenn die Schule berechtigt ist,
 * aber noch in keinem Import vorkam.
 */
export interface SchoolParticipation {
  school_id: string | null;
  school_key: string;
  name: string;
  city: string | null;
  plz: string | null;
  teachers_used: number;
  leadership_used: number;
  teacher_limit: number;
  leadership_limit: number;
  in_bestandsaufnahme: boolean;
  has_registered: boolean;
}

export interface ImportBatchSummary {
  id: string;
  created_at: string;
  file_count: number;
  rows_total: number;
  rows_new: number;
  rows_updated: number;
  rows_conflict: number;
  rows_error: number;
  files: ImportFileSummary[];
}

export interface ImportFileSummary {
  name: string;
  kurs_nr: string;
  rows: number;
  new: number;
  updated: number;
  conflicts: number;
  errors: number;
}

export interface ConflictItem {
  id: string;
  status: ConflictStatus;
  role: ParticipantRole;
  reason: string;
  created_at: string;
  school: { id: string; name: string; city: string | null } | null;
  person: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
  } | null;
  event: {
    id: string;
    kurs_nr: string;
    title: string;
    start_date: string | null;
  } | null;
}

export interface OverviewResponse {
  stats: {
    events_total: number;
    registrations_total: number;
    conflicts_open: number;
    /** Teilnahmeberechtigte Schulen (aus der Bestandsaufnahme). */
    schools_total: number;
    /** Davon mit mindestens einer Anmeldung. */
    schools_registered: number;
  };
  events: TrainingEvent[];
  schools: SchoolParticipation[];
  recent_batches: ImportBatchSummary[];
  is_admin: boolean;
}

export interface ImportFileResult {
  batch_id: string;
  file: ImportFileSummary & {
    skipped: { row: number; reason: string }[];
    error_messages: string[];
  };
  batch_totals: Pick<
    ImportBatchSummary,
    "rows_total" | "rows_new" | "rows_updated" | "rows_conflict" | "rows_error"
  >;
}

export interface AccessUser {
  id: string;
  full_name: string | null;
  school: string | null;
  email: string | null;
}

export const ROLE_LABELS: Record<ParticipantRole, string> = {
  teacher: "Lehrkraft",
  leadership: "Schulleitung",
};
