export interface Profile {
  id: string;
  full_name: string;
  school: string;
  role: "teacher" | "admin";
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface BestPractice {
  id: string;
  title: string;
  school_name: string;
  subject: string;
  grade_level: string;
  tools_used: string[];
  summary: string;
  content: string;
  author_id: string | null;
  published: boolean;
  created_at: string;
  updated_at: string;
  contact_person?: string | null;
  contact_email?: string | null;
  vorlage_data?: VorlageData | null;
  profiles?: { full_name: string };
  best_practice_categories?: { categories: Category }[];
}

// --- Anträge (Online-Formulare) ---

export type ApplicationStatus = "neu" | "in_bearbeitung" | "genehmigt" | "abgelehnt";

export interface ApplicationStudentAssistant {
  id: string;
  school_name: string;
  school_address: string;
  principal_name: string;
  contact_person: string;
  phone: string;
  email: string;
  teacher_count: number | null;
  student_count: number | null;
  support_technical_setup: boolean;
  support_onboarding: boolean;
  support_tech_support: boolean;
  support_material_creation: boolean;
  support_classroom: boolean;
  support_other: boolean;
  support_explanation: string | null;
  start_date: string | null;
  duration: string | null;
  hours_per_week: string | null;
  preferred_days: string | null;
  has_wifi: boolean;
  has_devices: boolean;
  device_count: number | null;
  has_interactive_displays: boolean;
  has_school_server: boolean;
  status: ApplicationStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ToolSelection {
  category: string;
  tools: { name: string; license_count: number }[];
}

export interface ApplicationToolLicense {
  id: string;
  school_name: string;
  school_address: string;
  principal_name: string;
  contact_person: string;
  phone: string;
  email: string;
  teacher_count: number | null;
  student_count: number | null;
  tool_selections: ToolSelection[];
  additional_tools: string | null;
  grade_levels: string | null;
  subjects: string | null;
  start_date: string | null;
  usage_description: string | null;
  privacy_concept_exists: boolean;
  parental_consent: boolean;
  it_infrastructure_meets_requirements: boolean;
  status: ApplicationStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface VorlageData {
  location: string;
  date: string;
  timeframe: string;
  ausgangslage: string;
  ziel: string;
  vorbereitung: string;
  ablauf: string;
  erfahrungen_positiv: string;
  erfahrungen_negativ: string;
  verbesserungen: string;
  rating_implementation: number;
  rating_student_adaptation: number;
  rating_recommendation: number;
  tipps: string;
  links: string;
  publication_consent: "ja_alles" | "ja_anonym" | "nein";
}
