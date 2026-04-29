// Geteilte Typen für die Online-Klassenbildung (Server + Client).

export type SessionStatus = "open" | "closed" | "assigned";

export interface KlassenbildungSession {
  id: string;
  user_id: string;
  code: string;
  name: string;
  school_name: string | null;
  status: SessionStatus;
  max_wishes: number;
  notify_subject: string | null;
  notify_body: string | null;
  contact_name: string | null;
  contact_email: string | null;
  created_at: string;
  updated_at: string;
}

/** Was Eltern beim Anmelden über die öffentliche API sehen dürfen */
export interface PublicSessionInfo {
  code: string;
  name: string;
  school_name: string | null;
  status: SessionStatus;
  max_wishes: number;
  contact_name: string | null;
  contact_email: string | null;
}

export interface KlassenbildungRegistration {
  id: string;
  session_id: string;
  child_name: string;
  gender: "m" | "w" | "x" | null;
  notes: string | null;
  prev_class: string | null;
  parent_email: string | null;
  parent_name: string | null;
  wishes: string[];
  no_go: string[];
  siblings: string[];
  assigned_class: number | null;
  notified_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Body für die Anmelde-API (von Eltern an Server) */
export interface RegistrationSubmit {
  session_code: string;
  child_name: string;
  gender?: "m" | "w" | "x";
  notes?: string;
  prev_class?: string;
  parent_email?: string;
  parent_name?: string;
  wishes?: string[];
  no_go?: string[];
  siblings?: string[];
}

/** Generiert einen menschenlesbaren Code wie "K3J9-X7P2" – ohne 0/O/1/I */
export function generateSessionCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 8; i++) {
    if (i === 4) s += "-";
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return s;
}
