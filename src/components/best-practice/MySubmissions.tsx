"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronRight,
  FileText,
  LogIn,
  Pencil,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  Wrench,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useIsAdmin } from "@/lib/useIsAdmin";
import type { ApplicationStatus, ToolSelection } from "@/lib/types";

// ── Typen: Voll-Ansicht (eingeloggt) ─────────────────────────
interface BestPracticeFullResult {
  id: string;
  title: string;
  school_name: string;
  published: boolean;
  created_at: string;
  updated_at: string;
  subject: string;
  grade_level: string;
  tools_used: string[];
  contact_person: string | null;
}
interface StudentAppFullResult {
  id: string;
  school_name: string;
  school_street: string | null;
  school_plz: string | null;
  school_city: string | null;
  principal_name: string | null;
  contact_person: string;
  phone: string | null;
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
interface ToolAppFullResult {
  id: string;
  school_name: string;
  school_street: string | null;
  school_plz: string | null;
  school_city: string | null;
  principal_name: string | null;
  contact_person: string;
  phone: string | null;
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
interface FullResult {
  email: string;
  best_practices: BestPracticeFullResult[];
  student_apps: StudentAppFullResult[];
  tool_apps: ToolAppFullResult[];
}

// ── Quick-Action-Konfiguration ───────────────────────────────

type QuickActionTone = "accent" | "primary" | "teal";

const QUICK_ACTIONS: Array<{
  id: string;
  href: string;
  title: string;
  body: string;
  icon: React.ReactNode;
  tone: QuickActionTone;
}> = [
  {
    id: "tool-lizenzen",
    href: "/fuer-schulen/antrag-tool-lizenzen",
    title: "Tool-Lizenzen beantragen",
    body: "Kostenlose, stiftungsfinanzierte Lizenzen für DSGVO-konforme Lern-Tools.",
    icon: <Wrench className="h-5 w-5" />,
    tone: "primary",
  },
  {
    id: "hilfskraefte",
    href: "/fuer-schulen/antrag-hilfskraefte",
    title: "Studentische Hilfskräfte",
    body: "Unterstützung bei Einrichtung, Onboarding und Tech-Support.",
    icon: <Users className="h-5 w-5" />,
    tone: "teal",
  },
  {
    id: "best-practice",
    href: "/best-practice/einreichen",
    title: "Best Practice einreichen",
    body: "Erfahrungen aus dem Unterricht für andere Schulen dokumentieren.",
    icon: <Sparkles className="h-5 w-5" />,
    tone: "accent",
  },
];

// ── Helfer ───────────────────────────────────────────────────

const APP_STATUS_CONFIG: Record<ApplicationStatus, { label: string; className: string }> = {
  neu:            { label: "Neu – wird geprüft", className: "bg-yellow-100 text-yellow-700" },
  in_bearbeitung: { label: "In Bearbeitung",      className: "bg-blue-100   text-blue-700"   },
  genehmigt:      { label: "Genehmigt",           className: "bg-green-100  text-green-700"  },
  abgelehnt:      { label: "Abgelehnt",           className: "bg-red-100    text-red-700"    },
};

function StatusBadge({ status }: { status: ApplicationStatus }) {
  const cfg = APP_STATUS_CONFIG[status] ?? APP_STATUS_CONFIG.neu;
  return (
    <span className={`inline-flex text-xs px-2.5 py-0.5 rounded-full font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

function PublishedBadge({ published }: { published: boolean }) {
  return published ? (
    <span className="inline-flex text-xs px-2.5 py-0.5 rounded-full font-medium bg-green-100 text-green-700">
      Veröffentlicht
    </span>
  ) : (
    <span className="inline-flex text-xs px-2.5 py-0.5 rounded-full font-medium bg-yellow-100 text-yellow-700">
      Eingereicht – wird geprüft
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div>
      <span className="text-xs font-semibold text-text">{label}: </span>
      <span className="text-xs text-text-light">{value}</span>
    </div>
  );
}

function AdminNoteBox({ note }: { note: string | null }) {
  if (!note) return null;
  return (
    <div className="mt-3 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
      <p className="text-xs font-semibold text-blue-700 mb-1">Rückmeldung der Projektkoordination:</p>
      <p className="text-xs text-blue-800 whitespace-pre-wrap">{note}</p>
    </div>
  );
}

function QuickActionCard({
  href,
  title,
  body,
  icon,
  tone,
  loginRedirect,
}: {
  href: string;
  title: string;
  body: string;
  icon: React.ReactNode;
  tone: QuickActionTone;
  /** Wenn gesetzt: Link führt zuerst über die Login-Seite mit
   *  redirect-Param zurück zur Ziel-URL. */
  loginRedirect: boolean;
}) {
  const finalHref = loginRedirect
    ? `/best-practice/login?redirect=${encodeURIComponent(href)}`
    : href;

  const toneStyles = {
    primary: {
      iconBg: "bg-primary/10 text-primary",
      border: "hover:border-primary/40",
      arrow: "text-primary",
    },
    teal: {
      iconBg: "bg-primary-light/15 text-primary",
      border: "hover:border-primary-light/50",
      arrow: "text-primary",
    },
    accent: {
      iconBg: "bg-accent/15 text-accent-strong",
      border: "hover:border-accent-strong/40",
      arrow: "text-accent-strong",
    },
  }[tone];

  return (
    <Link
      href={finalHref}
      className={`group relative flex h-full flex-col rounded-xl border border-border bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${toneStyles.border}`}
    >
      <span
        aria-hidden="true"
        className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${toneStyles.iconBg}`}
      >
        {icon}
      </span>
      <h4 className="mt-4 text-base font-bold text-primary">{title}</h4>
      <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-text-light">
        {body}
      </p>
      <span
        className={`mt-4 inline-flex items-center gap-1.5 text-sm font-bold ${toneStyles.arrow}`}
      >
        {loginRedirect ? "Erst anmelden" : "Jetzt starten"}
        <ArrowRight
          className="h-4 w-4 transition-transform group-hover:translate-x-1"
          aria-hidden="true"
        />
      </span>
    </Link>
  );
}

// ════════ Haupt-Component ════════════════════════════════════

export default function MySubmissions() {
  const isAdmin = useIsAdmin();
  const [loggedInEmail, setLoggedInEmail] = useState<string | null>(null);
  // null = noch nicht geprüft; "" = nicht eingeloggt; string = eingeloggt
  const [authState, setAuthState] = useState<"loading" | "in" | "out">(
    "loading",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fullResult, setFullResult] = useState<FullResult | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Login-Status prüfen und ggf. Einreichungen laden
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user?.email) {
        setAuthState("out");
        return;
      }
      setLoggedInEmail(data.user.email.toLowerCase());
      setAuthState("in");
      // Auto-Load der Einreichungen
      setLoading(true);
      const { data: result, error: rpcError } = await supabase.rpc(
        "get_my_submissions_full",
      );
      setLoading(false);
      if (rpcError) {
        setError("Einreichungen konnten nicht geladen werden.");
        return;
      }
      setFullResult(result as FullResult);
    });
  }, []);

  // Admins nicht anzeigen
  if (isAdmin === true) return null;

  async function handleDelete(type: "student" | "tool", id: string) {
    setDeletingId(id);
    const route = type === "student" ? "/api/delete-student-app" : "/api/delete-tool-app";
    const res = await fetch(route, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recordId: id }),
    });
    setDeletingId(null);
    setConfirmDeleteId(null);
    if (!res.ok) {
      setError("Löschen fehlgeschlagen. Bitte versuchen Sie es erneut.");
      return;
    }
    setFullResult((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        student_apps: prev.student_apps.filter((a) => a.id !== id),
        tool_apps: prev.tool_apps.filter((a) => a.id !== id),
      };
    });
  }

  const totalCount = fullResult
    ? fullResult.best_practices.length +
      fullResult.student_apps.length +
      fullResult.tool_apps.length
    : 0;
  const isLoggedIn = authState === "in";

  return (
    <div className="mt-16 border-t border-border pt-12">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="mb-2 flex items-center gap-3">
        <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
        <h2 className="text-2xl font-bold text-primary">Meine Einreichungen</h2>
      </div>
      <p className="mb-8 max-w-2xl text-text-light">
        {isLoggedIn
          ? "Hier sehen Sie alle Einreichungen Ihres Kontos und können direkt eine neue starten."
          : "Melden Sie sich an, um Anträge zu stellen und den Status Ihrer Einreichungen zu sehen."}
      </p>

      {/* ── Quick-Action-Karten ───────────────────────────── */}
      <div className="mb-10">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-text-light">
          Neue Einreichung starten
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {QUICK_ACTIONS.map((a) => (
            <QuickActionCard
              key={a.id}
              href={a.href}
              title={a.title}
              body={a.body}
              icon={a.icon}
              tone={a.tone}
              loginRedirect={!isLoggedIn}
            />
          ))}
        </div>
        {!isLoggedIn && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-text-light">
            <LogIn className="h-3 w-3" aria-hidden="true" />
            Sie werden zuerst zur Anmeldung geleitet und nach erfolgreichem Login
            direkt zum Formular weitergeleitet.
          </p>
        )}
      </div>

      {/* ── Login-Hinweis (wenn nicht eingeloggt) ─────────── */}
      {authState === "out" && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
              >
                <LogIn className="h-5 w-5" />
              </span>
              <div>
                <p className="font-bold text-primary">
                  Anmelden für laufende Einreichungen
                </p>
                <p className="mt-1 text-sm text-text-light">
                  Nach der Anmeldung sehen Sie hier den Status Ihrer Anträge und
                  Best-Practice-Beiträge – inklusive vollständiger Details.
                </p>
              </div>
            </div>
            <Link
              href="/best-practice/login"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-md"
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              Zur Anmeldung
            </Link>
          </div>
        </div>
      )}

      {/* ── Ladezustand ───────────────────────────────────── */}
      {isLoggedIn && loading && (
        <div className="rounded-xl border border-border bg-white p-6 text-center text-sm text-text-light">
          Einreichungen werden geladen …
        </div>
      )}

      {/* ── Fehler ────────────────────────────────────────── */}
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {/* ── Keine Einreichungen ───────────────────────────── */}
      {isLoggedIn && !loading && fullResult && totalCount === 0 && (
        <div className="rounded-xl border border-border bg-bg p-6 text-center text-sm text-text-light">
          Noch keine Einreichungen vorhanden – starten Sie oben Ihre erste!
        </div>
      )}

      {/* ── Voll-Ansicht (eingeloggt) ─────────────────────── */}
      {isLoggedIn && fullResult && totalCount > 0 && (
        <div className="mb-4 inline-flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
          <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
          {totalCount} {totalCount === 1 ? "Einreichung" : "Einreichungen"} unter{" "}
          <strong>{loggedInEmail}</strong> gefunden
        </div>
      )}

      {isLoggedIn && fullResult && totalCount > 0 && (
        <div className="space-y-8">
          {fullResult.best_practices.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-primary" aria-hidden="true" />
                <h3 className="text-base font-semibold text-primary">
                  Best-Practice-Beiträge ({fullResult.best_practices.length})
                </h3>
              </div>
              <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                {fullResult.best_practices.map((bp) => (
                  <div key={bp.id} className="bg-white px-5 py-5">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                      <div>
                        <p className="font-semibold text-text">{bp.title}</p>
                        <p className="text-xs text-text-light mt-0.5">
                          {bp.school_name} · Eingereicht am {formatDate(bp.created_at)}
                          {bp.updated_at !== bp.created_at && ` · Aktualisiert am ${formatDate(bp.updated_at)}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <PublishedBadge published={bp.published} />
                        {bp.published && (
                          <Link
                            href={`/best-practice/datenbank/${bp.id}`}
                            className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                          >
                            Ansehen <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                          </Link>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      <DetailField label="Fach" value={bp.subject} />
                      <DetailField label="Klassenstufe" value={bp.grade_level} />
                      <DetailField label="Eingesetztes Tool" value={bp.tools_used?.join(", ")} />
                      <DetailField label="Ansprechperson" value={bp.contact_person} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {fullResult.student_apps.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-primary" aria-hidden="true" />
                <h3 className="text-base font-semibold text-primary">
                  Anträge: Studentische Hilfskräfte ({fullResult.student_apps.length})
                </h3>
              </div>
              <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                {fullResult.student_apps.map((app) => (
                  <div key={app.id} className="bg-white px-5 py-5 space-y-4">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div>
                        <p className="font-semibold text-text">{app.school_name}</p>
                        <p className="text-xs text-text-light mt-0.5">
                          Eingereicht am {formatDate(app.created_at)}
                          {app.updated_at !== app.created_at && ` · Aktualisiert am ${formatDate(app.updated_at)}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                        <StatusBadge status={app.status} />
                        {app.status === "neu" && confirmDeleteId !== app.id && (
                          <Link
                            href={`/best-practice/meine-einreichungen/hilfskraefte/${app.id}/bearbeiten`}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary border border-primary/30 rounded-lg px-3 py-1.5 hover:bg-primary hover:text-white transition-all"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Bearbeiten
                          </Link>
                        )}
                        {app.status === "neu" && confirmDeleteId !== app.id && (
                          <button
                            onClick={() => setConfirmDeleteId(app.id)}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-600 hover:text-white transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Löschen
                          </button>
                        )}
                        {confirmDeleteId === app.id && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-red-700 font-medium">Wirklich löschen?</span>
                            <button
                              onClick={() => handleDelete("student", app.id)}
                              disabled={deletingId === app.id}
                              className="text-xs font-semibold bg-red-600 text-white rounded-lg px-3 py-1.5 hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                              {deletingId === app.id ? "…" : "Ja, löschen"}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-xs font-medium border border-border rounded-lg px-3 py-1.5 hover:bg-bg transition-colors"
                            >
                              Abbrechen
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Schule */}
                    <div>
                      <p className="text-xs font-semibold text-text-light uppercase tracking-wider mb-1.5">Schule</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        <DetailField label="Adresse" value={[app.school_street, app.school_plz && app.school_city ? `${app.school_plz} ${app.school_city}` : null].filter(Boolean).join(", ")} />
                        <DetailField label="Schulleitung" value={app.principal_name} />
                        <DetailField label="Ansprechperson" value={app.contact_person} />
                        <DetailField label="E-Mail" value={app.email} />
                        <DetailField label="Telefon" value={app.phone} />
                        <DetailField label="Lehrkräfte" value={app.teacher_count} />
                        <DetailField label="Schüler/innen" value={app.student_count} />
                      </div>
                    </div>
                    {/* Gewünschte Unterstützung */}
                    <div>
                      <p className="text-xs font-semibold text-text-light uppercase tracking-wider mb-1.5">Gewünschte Unterstützung</p>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {[
                          app.support_technical_setup && "Technische Einrichtung",
                          app.support_onboarding && "Onboarding Lehrkräfte",
                          app.support_tech_support && "Technischer Support",
                          app.support_material_creation && "Materialerstellung",
                          app.support_classroom && "Unterrichtsbegleitung",
                          app.support_other && "Sonstiges",
                        ].filter(Boolean).map((label) => (
                          <span key={String(label)} className="inline-flex rounded-full bg-primary/5 px-2.5 py-0.5 text-xs text-primary">{String(label)}</span>
                        ))}
                      </div>
                      <DetailField label="Erläuterung" value={app.support_explanation} />
                    </div>
                    {/* Zeitraum & Infrastruktur */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      <DetailField label="Startdatum" value={app.start_date ? formatDate(app.start_date) : null} />
                      <DetailField label="Dauer" value={app.duration} />
                      <DetailField label="Std. / Woche" value={app.hours_per_week} />
                      <DetailField label="Bevorzugte Tage" value={app.preferred_days} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-text-light uppercase tracking-wider mb-1.5">Technische Ausstattung</p>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          app.has_wifi && "WLAN vorhanden",
                          app.has_devices && (app.device_count ? `Geräte: ${app.device_count}` : "Geräte vorhanden"),
                          app.has_interactive_displays && "Interaktive Displays",
                          app.has_school_server && "Schulserver",
                        ].filter(Boolean).map((label) => (
                          <span key={String(label)} className="inline-flex rounded-full bg-primary/5 px-2.5 py-0.5 text-xs text-primary">{String(label)}</span>
                        ))}
                      </div>
                    </div>
                    <AdminNoteBox note={app.admin_notes} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {fullResult.tool_apps.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Wrench className="w-4 h-4 text-primary" aria-hidden="true" />
                <h3 className="text-base font-semibold text-primary">
                  Anträge: Tool-Lizenzen ({fullResult.tool_apps.length})
                </h3>
              </div>
              <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                {fullResult.tool_apps.map((app) => (
                  <div key={app.id} className="bg-white px-5 py-5 space-y-4">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div>
                        <p className="font-semibold text-text">{app.school_name}</p>
                        <p className="text-xs text-text-light mt-0.5">
                          Eingereicht am {formatDate(app.created_at)}
                          {app.updated_at !== app.created_at && ` · Aktualisiert am ${formatDate(app.updated_at)}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                        <StatusBadge status={app.status} />
                        {app.status === "neu" && confirmDeleteId !== app.id && (
                          <Link
                            href={`/best-practice/meine-einreichungen/tool-lizenzen/${app.id}/bearbeiten`}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary border border-primary/30 rounded-lg px-3 py-1.5 hover:bg-primary hover:text-white transition-all"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Bearbeiten
                          </Link>
                        )}
                        {app.status === "neu" && confirmDeleteId !== app.id && (
                          <button
                            onClick={() => setConfirmDeleteId(app.id)}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-600 hover:text-white transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Löschen
                          </button>
                        )}
                        {confirmDeleteId === app.id && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-red-700 font-medium">Wirklich löschen?</span>
                            <button
                              onClick={() => handleDelete("tool", app.id)}
                              disabled={deletingId === app.id}
                              className="text-xs font-semibold bg-red-600 text-white rounded-lg px-3 py-1.5 hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                              {deletingId === app.id ? "…" : "Ja, löschen"}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-xs font-medium border border-border rounded-lg px-3 py-1.5 hover:bg-bg transition-colors"
                            >
                              Abbrechen
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Schule */}
                    <div>
                      <p className="text-xs font-semibold text-text-light uppercase tracking-wider mb-1.5">Schule</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        <DetailField label="Adresse" value={[app.school_street, app.school_plz && app.school_city ? `${app.school_plz} ${app.school_city}` : null].filter(Boolean).join(", ")} />
                        <DetailField label="Schulleitung" value={app.principal_name} />
                        <DetailField label="Ansprechperson" value={app.contact_person} />
                        <DetailField label="E-Mail" value={app.email} />
                        <DetailField label="Telefon" value={app.phone} />
                        <DetailField label="Lehrkräfte" value={app.teacher_count} />
                        <DetailField label="Schüler/innen" value={app.student_count} />
                      </div>
                    </div>
                    {/* Tools */}
                    {app.tool_selections?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-text-light uppercase tracking-wider mb-1.5">Beantragte Tools</p>
                        <div className="space-y-0.5">
                          {app.tool_selections.flatMap((cat) =>
                            cat.tools.filter((t) => t.name).map((t, i) => (
                              <p key={`${cat.category}-${i}`} className="text-xs text-text-light">
                                {cat.category}: <strong className="text-text">{t.name}</strong> ({t.license_count} Lizenzen)
                              </p>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                    {app.additional_tools && (
                      <DetailField label="Weitere gewünschte Tools" value={app.additional_tools} />
                    )}
                    {/* Einsatz */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      <DetailField label="Klassenstufen" value={app.grade_levels} />
                      <DetailField label="Fächer / Bereiche" value={app.subjects} />
                      <DetailField label="Geplanter Beginn" value={app.start_date ? formatDate(app.start_date) : null} />
                    </div>
                    {app.usage_description && (
                      <div>
                        <p className="text-xs font-semibold text-text-light uppercase tracking-wider mb-1">Einsatzbeschreibung</p>
                        <p className="text-sm text-text whitespace-pre-wrap p-3 bg-bg rounded-lg">{app.usage_description}</p>
                      </div>
                    )}
                    {/* Datenschutz */}
                    <div>
                      <p className="text-xs font-semibold text-text-light uppercase tracking-wider mb-1.5">Datenschutz</p>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          app.privacy_concept_exists && "Datenschutzkonzept vorhanden",
                          app.parental_consent && "Elterneinwilligung liegt vor",
                          app.it_infrastructure_meets_requirements && "IT-Infrastruktur erfüllt Anforderungen",
                        ].filter(Boolean).map((label) => (
                          <span key={String(label)} className="inline-flex rounded-full bg-green-50 px-2.5 py-0.5 text-xs text-green-700">{String(label)}</span>
                        ))}
                      </div>
                    </div>
                    <AdminNoteBox note={app.admin_notes} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

