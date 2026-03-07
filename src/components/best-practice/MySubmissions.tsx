"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, FileText, Users, Wrench, ChevronRight, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { ApplicationStatus, ToolSelection } from "@/lib/types";

// ── Typen: Basis-Ansicht (anonym) ────────────────────────────
interface BestPracticeResult {
  id: string;
  title: string;
  school_name: string;
  published: boolean;
  created_at: string;
}
interface ApplicationResult {
  id: string;
  school_name: string;
  status: ApplicationStatus;
  created_at: string;
}
interface BasicResult {
  best_practices: BestPracticeResult[];
  student_apps: ApplicationResult[];
  tool_apps: ApplicationResult[];
}

// ── Typen: Voll-Ansicht (eingeloggt) ─────────────────────────
interface BestPracticeFullResult extends BestPracticeResult {
  subject: string;
  grade_level: string;
  tools_used: string[];
  contact_person: string | null;
  updated_at: string;
}
interface StudentAppFullResult {
  id: string;
  school_name: string;
  contact_person: string;
  status: ApplicationStatus;
  admin_notes: string | null;
  start_date: string | null;
  duration: string | null;
  hours_per_week: string | null;
  support_technical_setup: boolean;
  support_onboarding: boolean;
  support_tech_support: boolean;
  support_material_creation: boolean;
  support_classroom: boolean;
  support_other: boolean;
  created_at: string;
  updated_at: string;
}
interface ToolAppFullResult {
  id: string;
  school_name: string;
  contact_person: string;
  status: ApplicationStatus;
  admin_notes: string | null;
  grade_levels: string | null;
  subjects: string | null;
  start_date: string | null;
  usage_description: string | null;
  tool_selections: ToolSelection[];
  created_at: string;
  updated_at: string;
}
interface FullResult {
  email: string;
  best_practices: BestPracticeFullResult[];
  student_apps: StudentAppFullResult[];
  tool_apps: ToolAppFullResult[];
}

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

function supportList(app: StudentAppFullResult): string {
  const items: string[] = [];
  if (app.support_technical_setup)    items.push("Technische Einrichtung");
  if (app.support_onboarding)         items.push("Onboarding Lehrkräfte");
  if (app.support_tech_support)       items.push("Technischer Support");
  if (app.support_material_creation)  items.push("Materialerstellung");
  if (app.support_classroom)          items.push("Unterrichtsbegleitung");
  if (app.support_other)              items.push("Sonstiges");
  return items.join(", ") || "–";
}

export default function MySubmissions() {
  const [email, setEmail]                   = useState("");
  const [loggedInEmail, setLoggedInEmail]   = useState<string | null>(null);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState("");
  const [basicResult, setBasicResult]       = useState<BasicResult | null>(null);
  const [fullResult, setFullResult]         = useState<FullResult | null>(null);
  const [searched, setSearched]             = useState(false);

  // Auto-fill E-Mail wenn eingeloggt
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) {
        setLoggedInEmail(data.user.email.toLowerCase());
        setEmail(data.user.email);
      }
    });
  }, []);

  const isOwner =
    loggedInEmail !== null &&
    email.trim().toLowerCase() === loggedInEmail;

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setError("Bitte geben Sie eine gültige E-Mail-Adresse ein.");
      return;
    }
    setError("");
    setLoading(true);
    setBasicResult(null);
    setFullResult(null);

    const supabase = createClient();

    if (isOwner) {
      // Eingeloggt + eigene E-Mail → volle Details via Session
      const { data, error: rpcError } = await supabase.rpc("get_my_submissions_full");
      setLoading(false);
      setSearched(true);
      if (rpcError) {
        setError("Fehler bei der Abfrage. Bitte versuchen Sie es erneut.");
        return;
      }
      setFullResult(data as FullResult);
    } else {
      // Anonym / andere E-Mail → Basis-Status
      const { data, error: rpcError } = await supabase.rpc(
        "get_submissions_by_email",
        { search_email: trimmed }
      );
      setLoading(false);
      setSearched(true);
      if (rpcError) {
        setError("Fehler bei der Abfrage. Bitte versuchen Sie es erneut.");
        return;
      }
      setBasicResult(data as BasicResult);
    }
  }

  const totalCount = fullResult
    ? fullResult.best_practices.length + fullResult.student_apps.length + fullResult.tool_apps.length
    : basicResult
    ? basicResult.best_practices.length + basicResult.student_apps.length + basicResult.tool_apps.length
    : 0;

  return (
    <div className="mt-16 border-t border-border pt-12">
      <div className="flex items-center gap-3 mb-2">
        <Search className="w-5 h-5 text-primary" aria-hidden="true" />
        <h2 className="text-2xl font-bold text-primary">Meine Einreichungen</h2>
      </div>
      <p className="text-text-light mb-6 max-w-2xl">
        Geben Sie die E-Mail-Adresse ein, die Sie beim Einreichen verwendet haben,
        um den aktuellen Status Ihrer Anträge und Best-Practice-Beiträge zu sehen.
        {loggedInEmail && (
          <span className="inline-flex items-center gap-1 ml-2 text-green-700 font-medium text-sm">
            <ShieldCheck className="w-4 h-4" aria-hidden="true" />
            Eingeloggt – volle Details verfügbar
          </span>
        )}
      </p>

      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 max-w-lg mb-8">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ihre@schule.de"
          required
          className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-colors"
          aria-label="E-Mail-Adresse für Statusabfrage"
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          <Search className="w-4 h-4" aria-hidden="true" />
          {loading ? "Suche …" : "Status abfragen"}
        </button>
      </form>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {searched && totalCount === 0 && (
        <div className="bg-bg rounded-xl p-6 text-center text-text-light text-sm border border-border">
          Keine Einreichungen für diese E-Mail-Adresse gefunden.
        </div>
      )}

      {/* ── Basis-Ansicht (anonym / andere E-Mail) ───────────── */}
      {basicResult && totalCount > 0 && (
        <div className="space-y-8">
          {basicResult.best_practices.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-primary" aria-hidden="true" />
                <h3 className="text-base font-semibold text-primary">
                  Best-Practice-Beiträge ({basicResult.best_practices.length})
                </h3>
              </div>
              <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                {basicResult.best_practices.map((bp) => (
                  <div key={bp.id} className="bg-white px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <p className="font-medium text-text text-sm">{bp.title}</p>
                      <p className="text-xs text-text-light mt-0.5">
                        {bp.school_name} · Eingereicht am {formatDate(bp.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <PublishedBadge published={bp.published} />
                      {bp.published && (
                        <Link
                          href={`/best-practice/datenbank/${bp.id}`}
                          className="inline-flex items-center gap-1 text-xs text-primary-light hover:text-primary transition-colors"
                        >
                          Ansehen <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
          {basicResult.student_apps.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-primary" aria-hidden="true" />
                <h3 className="text-base font-semibold text-primary">
                  Anträge: Studentische Hilfskräfte ({basicResult.student_apps.length})
                </h3>
              </div>
              <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                {basicResult.student_apps.map((app) => (
                  <div key={app.id} className="bg-white px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <p className="font-medium text-text text-sm">{app.school_name}</p>
                      <p className="text-xs text-text-light mt-0.5">Eingereicht am {formatDate(app.created_at)}</p>
                    </div>
                    <StatusBadge status={app.status} />
                  </div>
                ))}
              </div>
            </section>
          )}
          {basicResult.tool_apps.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Wrench className="w-4 h-4 text-primary" aria-hidden="true" />
                <h3 className="text-base font-semibold text-primary">
                  Anträge: Tool-Lizenzen ({basicResult.tool_apps.length})
                </h3>
              </div>
              <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                {basicResult.tool_apps.map((app) => (
                  <div key={app.id} className="bg-white px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <p className="font-medium text-text text-sm">{app.school_name}</p>
                      <p className="text-xs text-text-light mt-0.5">Eingereicht am {formatDate(app.created_at)}</p>
                    </div>
                    <StatusBadge status={app.status} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ── Voll-Ansicht (eingeloggt, eigene E-Mail) ─────────── */}
      {fullResult && totalCount > 0 && (
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
                            className="inline-flex items-center gap-1 text-xs text-primary-light hover:text-primary transition-colors"
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
                  <div key={app.id} className="bg-white px-5 py-5">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                      <div>
                        <p className="font-semibold text-text">{app.school_name}</p>
                        <p className="text-xs text-text-light mt-0.5">
                          Ansprechperson: {app.contact_person} · Eingereicht am {formatDate(app.created_at)}
                          {app.updated_at !== app.created_at && ` · Aktualisiert am ${formatDate(app.updated_at)}`}
                        </p>
                      </div>
                      <StatusBadge status={app.status} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      <DetailField label="Gewünschte Unterstützung" value={supportList(app)} />
                      <DetailField label="Startdatum" value={app.start_date ? formatDate(app.start_date) : null} />
                      <DetailField label="Dauer" value={app.duration} />
                      <DetailField label="Std. / Woche" value={app.hours_per_week} />
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
                  <div key={app.id} className="bg-white px-5 py-5">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                      <div>
                        <p className="font-semibold text-text">{app.school_name}</p>
                        <p className="text-xs text-text-light mt-0.5">
                          Ansprechperson: {app.contact_person} · Eingereicht am {formatDate(app.created_at)}
                          {app.updated_at !== app.created_at && ` · Aktualisiert am ${formatDate(app.updated_at)}`}
                        </p>
                      </div>
                      <StatusBadge status={app.status} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      <DetailField label="Klassenstufen" value={app.grade_levels} />
                      <DetailField label="Fächer" value={app.subjects} />
                      <DetailField label="Startdatum" value={app.start_date ? formatDate(app.start_date) : null} />
                      <DetailField label="Einsatzbeschreibung" value={app.usage_description} />
                    </div>
                    {app.tool_selections?.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-text mb-1">Beantragte Tools:</p>
                        <div className="space-y-0.5">
                          {app.tool_selections.flatMap((cat) =>
                            cat.tools
                              .filter((t) => t.name)
                              .map((t, i) => (
                                <p key={`${cat.category}-${i}`} className="text-xs text-text-light">
                                  {cat.category}: <strong>{t.name}</strong> ({t.license_count} Lizenzen)
                                </p>
                              ))
                          )}
                        </div>
                      </div>
                    )}
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
