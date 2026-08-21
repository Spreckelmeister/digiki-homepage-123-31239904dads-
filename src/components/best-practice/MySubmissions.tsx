"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronRight,
  FileText,
  Inbox,
  LogIn,
  Pencil,
  Sparkles,
  Trash2,
  Users,
  Wrench,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useIsAdmin } from "@/lib/useIsAdmin";
import type { ApplicationStatus, ToolSelection } from "@/lib/types";
import {
  labelFor,
  SUPPORT_AREA_OPTIONS,
  SCOPE_PRESET_OPTIONS,
} from "@/lib/applications/hilfskraefteOptions";

// ════════ Types ══════════════════════════════════════════════

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
  contact_person: string;
  status: ApplicationStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  start_date: string | null;
  hours_per_week: string | null;
  support_technical_setup: boolean;
  support_onboarding: boolean;
  support_tech_support: boolean;
  support_material_creation: boolean;
  support_classroom: boolean;
  support_other: boolean;
  /** Neues Antragsmodell „punktuelle Unterstützung" (Migration 030). */
  support_area: string | null;
  scope_preset: string | null;
}
interface ToolAppFullResult {
  id: string;
  school_name: string;
  contact_person: string;
  status: ApplicationStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  tool_selections: ToolSelection[];
  start_date: string | null;
}
interface FullResult {
  best_practices: BestPracticeFullResult[];
  student_apps: StudentAppFullResult[];
  tool_apps: ToolAppFullResult[];
}

// ════════ Quick-Action-Karten oben ═══════════════════════════

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
    body: "Punktuelle Unterstützung bei konkreten Hürden – nach Ihrer Schulungsteilnahme.",
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
  loginRedirect: boolean;
}) {
  const finalHref = loginRedirect
    ? `/best-practice/login?redirect=${encodeURIComponent(href)}`
    : href;
  const t = {
    primary: {
      iconBg: "bg-primary/10 text-primary",
      border: "hover:border-primary/40",
      arrow: "text-primary",
    },
    teal: {
      iconBg: "bg-primary-light/15 text-primary",
      border: "hover:border-primary-light/55",
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
      className={`group relative flex h-full flex-col rounded-2xl border border-border bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${t.border}`}
    >
      <span
        aria-hidden="true"
        className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${t.iconBg}`}
      >
        {icon}
      </span>
      <h4 className="mt-4 text-base font-bold text-primary">{title}</h4>
      <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-text-light">
        {body}
      </p>
      <span
        className={`mt-4 inline-flex items-center gap-1.5 text-sm font-bold ${t.arrow}`}
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

// ════════ Helfer ═════════════════════════════════════════════

const APP_STATUS_CONFIG: Record<
  ApplicationStatus,
  { label: string; className: string; dot: string }
> = {
  neu:            { label: "Neu – wird geprüft", className: "bg-amber-50 text-amber-800 border-amber-200", dot: "bg-amber-400" },
  in_bearbeitung: { label: "In Bearbeitung",     className: "bg-blue-50  text-blue-800  border-blue-200",  dot: "bg-blue-500"  },
  genehmigt:      { label: "Genehmigt",          className: "bg-green-50 text-green-800 border-green-200", dot: "bg-emerald-500" },
  abgelehnt:      { label: "Abgelehnt",          className: "bg-red-50   text-red-800   border-red-200",   dot: "bg-red-500"   },
};

function StatusPill({ status }: { status: ApplicationStatus }) {
  const cfg = APP_STATUS_CONFIG[status] ?? APP_STATUS_CONFIG.neu;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${cfg.className}`}
    >
      <span
        aria-hidden="true"
        className={`inline-block h-1.5 w-1.5 rounded-full ${cfg.dot}`}
      />
      {cfg.label}
    </span>
  );
}

function PublishedPill({ published }: { published: boolean }) {
  return published ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-[11px] font-semibold text-green-800">
      <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
      Veröffentlicht
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
      <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
      Eingereicht – wird geprüft
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function CategoryHeader({
  icon,
  title,
  count,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
}) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span
        aria-hidden="true"
        className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary"
      >
        {icon}
      </span>
      <h3 className="text-base font-bold text-primary">{title}</h3>
      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary/10 px-2 text-[11px] font-bold tabular-nums text-primary">
        {count}
      </span>
    </div>
  );
}

function AdminNoteBox({ note }: { note: string | null }) {
  if (!note) return null;
  return (
    <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2.5">
      <p className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700">
        Rückmeldung
      </p>
      <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-blue-900">
        {note}
      </p>
    </div>
  );
}

function MetaChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex rounded-full bg-bg px-2 py-0.5 text-[11px] text-text-light">
      {children}
    </span>
  );
}

// ════════ Submission-Karten ══════════════════════════════════

function BestPracticeCard({ bp }: { bp: BestPracticeFullResult }) {
  return (
    <article className="rounded-xl border border-border bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text">{bp.title}</p>
          <p className="mt-0.5 text-xs text-text-light">
            {bp.school_name} · Eingereicht am {formatDate(bp.created_at)}
            {bp.updated_at !== bp.created_at &&
              ` · zuletzt aktualisiert ${formatDate(bp.updated_at)}`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <PublishedPill published={bp.published} />
          {bp.published && (
            <Link
              href={`/best-practice/datenbank/${bp.id}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-primary/80"
            >
              Ansehen
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {bp.subject && <MetaChip>Fach: {bp.subject}</MetaChip>}
        {bp.grade_level && <MetaChip>Klasse: {bp.grade_level}</MetaChip>}
        {bp.tools_used?.length > 0 && (
          <MetaChip>Tools: {bp.tools_used.join(", ")}</MetaChip>
        )}
      </div>
    </article>
  );
}

function ApplicationCard({
  app,
  type,
  onDelete,
  isDeleting,
  isConfirmingDelete,
  onConfirmDelete,
  onCancelDelete,
  detailText,
}: {
  app: StudentAppFullResult | ToolAppFullResult;
  type: "hilfskraefte" | "tool-lizenzen";
  onDelete: () => void;
  isDeleting: boolean;
  isConfirmingDelete: boolean;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  detailText?: string;
}) {
  const canEdit = app.status === "neu";
  const editHref =
    type === "hilfskraefte"
      ? `/best-practice/meine-einreichungen/hilfskraefte/${app.id}/bearbeiten`
      : `/best-practice/meine-einreichungen/tool-lizenzen/${app.id}/bearbeiten`;

  return (
    <article className="rounded-xl border border-border bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text">{app.school_name}</p>
          <p className="mt-0.5 text-xs text-text-light">
            Eingereicht am {formatDate(app.created_at)}
            {app.updated_at !== app.created_at &&
              ` · zuletzt aktualisiert ${formatDate(app.updated_at)}`}
          </p>
        </div>
        <StatusPill status={app.status} />
      </div>

      {detailText && (
        <p className="mt-3 text-[12.5px] leading-relaxed text-text-light">
          {detailText}
        </p>
      )}

      <AdminNoteBox note={app.admin_notes} />

      {canEdit && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          {!isConfirmingDelete ? (
            <>
              <Link
                href={editHref}
                className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-white px-3 py-1.5 text-xs font-semibold text-primary transition-all hover:-translate-y-0.5 hover:bg-primary hover:text-white hover:shadow-sm"
              >
                <Pencil className="h-3.5 w-3.5" />
                Bearbeiten
              </Link>
              <button
                type="button"
                onClick={onConfirmDelete}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition-all hover:-translate-y-0.5 hover:bg-red-600 hover:text-white hover:shadow-sm"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Löschen
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-red-700">
                Wirklich löschen?
              </span>
              <button
                type="button"
                onClick={onDelete}
                disabled={isDeleting}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? "…" : "Ja, löschen"}
              </button>
              <button
                type="button"
                onClick={onCancelDelete}
                className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-medium transition-colors hover:bg-bg"
              >
                Abbrechen
              </button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

// Helper: kompakte Kurz-Beschreibung der Application-Wünsche
function studentAppShort(app: StudentAppFullResult): string {
  // Neues Antragsmodell (punktuelle Unterstützung): eine konkrete Hürde
  // + fester Umfang statt Wunschliste und Wochenstunden.
  if (app.support_area) {
    const parts: string[] = [];
    const areaLabel = labelFor(SUPPORT_AREA_OPTIONS, app.support_area);
    if (areaLabel) parts.push(`Anliegen: ${areaLabel}`);
    const scopeLabel = labelFor(SCOPE_PRESET_OPTIONS, app.scope_preset);
    if (scopeLabel) parts.push(scopeLabel);
    if (app.start_date) parts.push(`frühestens ab ${formatDate(app.start_date)}`);
    return parts.join(" · ");
  }
  const wishes: string[] = [];
  if (app.support_technical_setup) wishes.push("Tech-Setup");
  if (app.support_onboarding) wishes.push("Onboarding");
  if (app.support_tech_support) wishes.push("Tech-Support");
  if (app.support_material_creation) wishes.push("Materialerstellung");
  if (app.support_classroom) wishes.push("Unterrichtsbegleitung");
  if (app.support_other) wishes.push("Sonstiges");
  const parts: string[] = [];
  if (wishes.length > 0) parts.push(`Gewünscht: ${wishes.join(", ")}`);
  if (app.hours_per_week) parts.push(`${app.hours_per_week}/Woche`);
  if (app.start_date) parts.push(`ab ${formatDate(app.start_date)}`);
  return parts.join(" · ");
}

function toolAppShort(app: ToolAppFullResult): string {
  const total = app.tool_selections.reduce(
    (sum, cat) =>
      sum + cat.tools.reduce((t, x) => t + (x.license_count || 0), 0),
    0,
  );
  const cats = app.tool_selections
    .filter((c) => c.tools.some((t) => t.name))
    .map((c) => c.category)
    .join(", ");
  const parts: string[] = [];
  if (total > 0) parts.push(`${total} Lizenzen`);
  if (cats) parts.push(cats);
  if (app.start_date) parts.push(`ab ${formatDate(app.start_date)}`);
  return parts.join(" · ");
}

// ════════ Haupt-Component ════════════════════════════════════

export default function MySubmissions() {
  const isAdmin = useIsAdmin();
  const [authState, setAuthState] = useState<"loading" | "in" | "out">(
    "loading",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fullResult, setFullResult] = useState<FullResult | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        setAuthState("out");
        return;
      }
      setAuthState("in");
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

  if (isAdmin === true) return null;

  async function handleDelete(type: "student" | "tool", id: string) {
    setDeletingId(id);
    const route =
      type === "student" ? "/api/delete-student-app" : "/api/delete-tool-app";
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
    <section className="mt-16 border-t border-border pt-12">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="mb-2 flex items-center gap-3">
        <Inbox className="h-5 w-5 text-primary" aria-hidden="true" />
        <h2 className="text-2xl font-bold text-primary">Meine Einreichungen</h2>
        {isLoggedIn && fullResult && totalCount > 0 && (
          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-2 text-[11px] font-bold tabular-nums text-white">
            {totalCount}
          </span>
        )}
      </div>
      <p className="mb-8 max-w-2xl text-text-light">
        {isLoggedIn
          ? "Alle Anträge und Best-Practice-Beiträge Ihres Kontos – inklusive Status und Rückmeldungen des Projekt-Teams."
          : "Melden Sie sich an, um Anträge zu stellen und den Status Ihrer Einreichungen zu sehen."}
      </p>

      {/* ── Quick-Actions ──────────────────────────────────── */}
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
            Sie werden zuerst zur Anmeldung geleitet und nach erfolgreichem
            Login direkt zum Formular weitergeleitet.
          </p>
        )}
      </div>

      {/* ── Login-Hinweis ──────────────────────────────────── */}
      {authState === "out" && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6">
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
                  Laufende Einreichungen einsehen
                </p>
                <p className="mt-1 text-sm text-text-light">
                  Nach der Anmeldung sehen Sie hier den Status Ihrer Anträge
                  und Best-Practice-Beiträge.
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

      {/* ── Ladezustand (Skeleton-Karten) ──────────────────── */}
      {isLoggedIn && loading && (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl border border-border bg-white"
            />
          ))}
        </div>
      )}

      {/* ── Fehler ────────────────────────────────────────── */}
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* ── Empty State ───────────────────────────────────── */}
      {isLoggedIn && !loading && fullResult && totalCount === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-bg/40 px-6 py-10 text-center">
          <p className="text-sm text-text-light">
            Noch keine Einreichungen vorhanden — starten Sie oben Ihre erste!
          </p>
        </div>
      )}

      {/* ── Liste ─────────────────────────────────────────── */}
      {isLoggedIn && fullResult && totalCount > 0 && (
        <div className="space-y-10">
          {fullResult.best_practices.length > 0 && (
            <section>
              <CategoryHeader
                icon={<FileText className="h-4 w-4" />}
                title="Best-Practice-Beiträge"
                count={fullResult.best_practices.length}
              />
              <div className="space-y-3">
                {fullResult.best_practices.map((bp) => (
                  <BestPracticeCard key={bp.id} bp={bp} />
                ))}
              </div>
            </section>
          )}

          {fullResult.student_apps.length > 0 && (
            <section>
              <CategoryHeader
                icon={<Users className="h-4 w-4" />}
                title="Anträge: Studentische Hilfskräfte"
                count={fullResult.student_apps.length}
              />
              <div className="space-y-3">
                {fullResult.student_apps.map((app) => (
                  <ApplicationCard
                    key={app.id}
                    app={app}
                    type="hilfskraefte"
                    detailText={studentAppShort(app)}
                    isConfirmingDelete={confirmDeleteId === app.id}
                    isDeleting={deletingId === app.id}
                    onConfirmDelete={() => setConfirmDeleteId(app.id)}
                    onCancelDelete={() => setConfirmDeleteId(null)}
                    onDelete={() => handleDelete("student", app.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {fullResult.tool_apps.length > 0 && (
            <section>
              <CategoryHeader
                icon={<Wrench className="h-4 w-4" />}
                title="Anträge: Tool-Lizenzen"
                count={fullResult.tool_apps.length}
              />
              <div className="space-y-3">
                {fullResult.tool_apps.map((app) => (
                  <ApplicationCard
                    key={app.id}
                    app={app}
                    type="tool-lizenzen"
                    detailText={toolAppShort(app)}
                    isConfirmingDelete={confirmDeleteId === app.id}
                    isDeleting={deletingId === app.id}
                    onConfirmDelete={() => setConfirmDeleteId(app.id)}
                    onCancelDelete={() => setConfirmDeleteId(null)}
                    onDelete={() => handleDelete("tool", app.id)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </section>
  );
}
