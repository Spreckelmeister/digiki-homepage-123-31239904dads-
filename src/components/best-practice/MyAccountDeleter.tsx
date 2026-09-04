"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Trash2,
  AlertTriangle,
  Eye,
  EyeOff,
  X,
  FileText,
  ClipboardList,
  Users,
  BarChart2,
  MailCheck,
  Clock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import CodeVerifyBox from "@/components/auth/CodeVerifyBox";

const CONFIRM_WORD = "LÖSCHEN";

interface Counts {
  bestandsaufnahmen: number;
  toolApps: number;
  studentApps: number;
  bestPractices: number;
}

type ModalPhase = "confirm" | "sent";

export default function MyAccountDeleter() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [phase, setPhase] = useState<ModalPhase>("confirm");
  const [sentToEmail, setSentToEmail] = useState<string>("");
  const [countsLoading, setCountsLoading] = useState(false);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [deleteBestPractices, setDeleteBestPractices] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Speichert den Trigger, damit der Fokus nach Modal-Close zurückkehrt.
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const canOpenModal =
    password.length > 0 && confirmText.trim().toUpperCase() === CONFIRM_WORD;

  async function openModal(e: React.FormEvent) {
    e.preventDefault();
    if (!canOpenModal) return;
    setError(null);
    setPhase("confirm");
    setModalOpen(true);
    setCountsLoading(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !user.email) {
        setCounts(null);
        return;
      }

      const [ba, tools, students, bp] = await Promise.all([
        supabase
          .from("bestandsaufnahme_responses")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("applications_tool_licenses")
          .select("id", { count: "exact", head: true })
          .ilike("email", user.email),
        supabase
          .from("applications_student_assistants")
          .select("id", { count: "exact", head: true })
          .ilike("email", user.email),
        supabase
          .from("best_practices")
          .select("id", { count: "exact", head: true })
          .eq("author_id", user.id),
      ]);

      setCounts({
        bestandsaufnahmen: ba.count ?? 0,
        toolApps: tools.count ?? 0,
        studentApps: students.count ?? 0,
        bestPractices: bp.count ?? 0,
      });
    } finally {
      setCountsLoading(false);
    }
  }

  function closeModal() {
    if (loading) return;
    setModalOpen(false);
    // Nach „sent" die Felder leeren, damit niemand die Löschung ein zweites
    // Mal aus Versehen anstößt – die Anfrage hängt jetzt nur noch am Link.
    if (phase === "sent") {
      setPassword("");
      setConfirmText("");
      setSentToEmail("");
    }
    setCounts(null);
    setDeleteBestPractices(false);
    setError(null);
    setPhase("confirm");
  }

  async function handleRequestDelete() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/account/request-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, deleteBestPractices }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Anfrage fehlgeschlagen.");
        setLoading(false);
        return;
      }

      setSentToEmail(typeof json.email === "string" ? json.email : "");
      setPhase("sent");
      setLoading(false);
    } catch {
      setError("Netzwerkfehler.");
      setLoading(false);
    }
  }

  // ESC schließt Modal
  useEffect(() => {
    if (!modalOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOpen, loading]);

  // Fokus-Management: beim Öffnen auf den Schließen-Button, beim Schließen
  // zurück auf den Trigger – wichtig für Tastatur- und Screenreader-Nutzer.
  // Startet bewusst mit `true`, damit der initiale Render (modalOpen=false)
  // nicht den Trigger-Button ungewollt fokussiert.
  const skipInitialFocus = useRef(true);
  useEffect(() => {
    if (skipInitialFocus.current) {
      skipInitialFocus.current = false;
      return;
    }
    if (modalOpen) {
      closeButtonRef.current?.focus();
    } else {
      triggerRef.current?.focus();
    }
  }, [modalOpen]);

  const inputClass =
    "w-full rounded-lg border border-red-200 bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-red-400 focus:border-red-400 outline-none transition-colors";

  return (
    <>
      <div className="rounded-xl p-6 md:p-8 border border-red-200 bg-red-50/60">
        <h2 className="text-lg font-semibold text-red-900 mb-2 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" aria-hidden="true" />
          Konto löschen
        </h2>
        <p className="text-sm text-red-900/90 leading-relaxed mb-5">
          Diese Aktion ist <strong>endgültig</strong> und kann nicht rückgängig gemacht werden.
          Ihr Zugang, Ihr Profil, Ihre Bestandsaufnahmen und Ihre eingereichten Anträge
          werden vollständig gelöscht. Für Ihre Best-Practice-Beiträge werden Sie im
          nächsten Schritt gefragt.
        </p>

        <form onSubmit={openModal} className="space-y-4">
          <div>
            <label
              htmlFor="deletePassword"
              className="block text-sm font-medium text-red-900 mb-1.5"
            >
              Passwort zur Bestätigung
            </label>
            <div className="relative">
              <input
                id="deletePassword"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass + " pr-11"}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={
                  showPassword ? "Passwort verbergen" : "Passwort anzeigen"
                }
                className="absolute inset-y-0 right-0 flex items-center px-3 text-red-900/60 hover:text-red-900"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Eye className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="deleteConfirm"
              className="block text-sm font-medium text-red-900 mb-1.5"
            >
              Zur Bestätigung „<span className="font-mono">{CONFIRM_WORD}</span>" eingeben
            </label>
            <input
              id="deleteConfirm"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className={inputClass + " font-mono tracking-wider"}
              placeholder={CONFIRM_WORD}
              autoComplete="off"
            />
          </div>

          <div className="pt-1">
            <button
              ref={triggerRef}
              type="submit"
              disabled={!canOpenModal}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
              Weiter zur Bestätigung
            </button>
          </div>
        </form>
      </div>

      {/* Bestätigungs-Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="w-full max-w-lg bg-white rounded-xl shadow-xl my-auto">
            <div className="flex items-start justify-between p-6 pb-4 border-b border-border">
              {phase === "confirm" ? (
                <h3
                  id="delete-modal-title"
                  className="text-xl font-semibold text-red-900 flex items-center gap-2"
                >
                  <AlertTriangle className="w-6 h-6" aria-hidden="true" />
                  Löschung einleiten?
                </h3>
              ) : (
                <h3
                  id="delete-modal-title"
                  className="text-xl font-semibold text-slate-900 flex items-center gap-2"
                >
                  <MailCheck className="w-6 h-6 text-slate-700" aria-hidden="true" />
                  Bestätigungsmail versendet
                </h3>
              )}
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeModal}
                disabled={loading}
                aria-label="Schließen"
                className="text-text-light hover:text-text disabled:opacity-50"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {phase === "confirm" ? (
              <>
                <div className="p-6 space-y-5">
                  <p className="text-sm text-text leading-relaxed">
                    Die folgenden Daten werden mit der Löschung <strong>dauerhaft</strong>
                    {" "}aus unserem System entfernt:
                  </p>

                  {countsLoading ? (
                    <div className="text-sm text-text-light text-center py-6">
                      Daten werden geladen …
                    </div>
                  ) : counts ? (
                    <ul className="divide-y divide-border rounded-lg border border-border bg-bg/50">
                      <SummaryRow
                        icon={<BarChart2 className="w-4 h-4" aria-hidden="true" />}
                        label="Bestandsaufnahmen"
                        count={counts.bestandsaufnahmen}
                        willBeDeleted={true}
                      />
                      <SummaryRow
                        icon={<ClipboardList className="w-4 h-4" aria-hidden="true" />}
                        label="Tool-Lizenz-Anträge"
                        count={counts.toolApps}
                        willBeDeleted={true}
                      />
                      <SummaryRow
                        icon={<Users className="w-4 h-4" aria-hidden="true" />}
                        label="Hilfskräfte-Anträge"
                        count={counts.studentApps}
                        willBeDeleted={true}
                      />
                      <SummaryRow
                        icon={<FileText className="w-4 h-4" aria-hidden="true" />}
                        label="Best-Practice-Beiträge"
                        count={counts.bestPractices}
                        willBeDeleted={deleteBestPractices}
                        hint={
                          counts.bestPractices === 0
                            ? "keine vorhanden"
                            : deleteBestPractices
                              ? "werden gelöscht"
                              : "bleiben anonym erhalten"
                        }
                      />
                    </ul>
                  ) : null}

                  {counts && counts.bestPractices > 0 && (
                    <div className="rounded-lg border border-border bg-bg p-4">
                      <p className="text-sm font-medium text-text mb-3">
                        Was soll mit Ihren Best-Practice-Beiträgen geschehen?
                      </p>
                      <div className="space-y-2">
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="radio"
                            name="bp-action"
                            checked={!deleteBestPractices}
                            onChange={() => setDeleteBestPractices(false)}
                            className="mt-1 text-accent focus:ring-accent-strong"
                          />
                          <span className="text-sm text-text">
                            <strong>Erhalten (anonym)</strong> – Ihre Beiträge bleiben für andere
                            Lehrkräfte sichtbar, werden aber von Ihrem Konto entkoppelt.
                          </span>
                        </label>
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="radio"
                            name="bp-action"
                            checked={deleteBestPractices}
                            onChange={() => setDeleteBestPractices(true)}
                            className="mt-1 text-red-600 focus:ring-red-400"
                          />
                          <span className="text-sm text-text">
                            <strong className="text-red-700">Mit löschen</strong> – alle Ihre
                            Best-Practice-Beiträge werden endgültig aus der Datenbank entfernt.
                          </span>
                        </label>
                      </div>
                    </div>
                  )}

                  <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900 leading-relaxed">
                    <p className="font-semibold mb-1">Zwei-Schritt-Bestätigung</p>
                    <p>
                      Nach Klick auf „Bestätigungsmail senden" erhalten Sie eine E-Mail mit
                      einem 8-stelligen Code. Erst durch Eingabe dieses Codes wird Ihr Konto
                      unwiderruflich gelöscht. Der Code ist 24 Stunden gültig.
                    </p>
                  </div>

                  {error && (
                    <p className="text-sm text-red-800 bg-red-100 border border-red-300 rounded-lg p-3">
                      {error}
                    </p>
                  )}
                </div>

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 p-6 pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-white px-5 py-2.5 text-sm font-semibold text-text hover:bg-bg transition-colors disabled:opacity-50"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="button"
                    onClick={handleRequestDelete}
                    disabled={loading || countsLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                    {loading ? "Wird gesendet..." : "Bestätigungsmail senden"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="p-6 md:p-8 space-y-5">
                  <div className="flex items-start gap-4">
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 ring-1 ring-slate-200"
                      aria-hidden="true"
                    >
                      <MailCheck className="h-6 w-6" strokeWidth={1.75} />
                    </div>
                    <div className="pt-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500 mb-1">
                        Aktion erforderlich
                      </p>
                      <p className="text-base text-slate-900 font-medium leading-snug">
                        Wir haben Ihnen einen 8-stelligen Bestätigungscode per
                        E-Mail gesendet. Geben Sie ihn unten ein, um die
                        Löschung endgültig abzuschließen.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500 mb-1.5">
                      Versand an
                    </p>
                    <p className="text-sm text-slate-900 font-mono break-all">
                      {sentToEmail || "Ihre hinterlegte Adresse"}
                    </p>
                  </div>

                  <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 leading-relaxed">
                    <Clock className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
                    <p>
                      Der Code ist <strong>24 Stunden</strong> gültig. Danach startet der
                      Vorgang wieder von vorn. Solange Sie den Code nicht eingeben,
                      bleibt Ihr Konto unverändert aktiv.
                    </p>
                  </div>

                  <CodeVerifyBox
                    idPrefix="account-delete"
                    submitLabel="Löschung endgültig bestätigen"
                    loadingLabel="Wird geprüft …"
                    destructive
                    onVerify={async (code) => {
                      try {
                        const res = await fetch("/api/account/confirm-delete-code", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ email: sentToEmail, code }),
                        });
                        const json = await res.json().catch(() => ({}));
                        if (!res.ok) {
                          return {
                            ok: false,
                            error:
                              typeof json.error === "string"
                                ? json.error
                                : "Code konnte nicht eingelöst werden.",
                          };
                        }
                        router.push("/konto-geloescht?status=ok");
                        return { ok: true };
                      } catch {
                        return {
                          ok: false,
                          error: "Netzwerkfehler. Bitte erneut versuchen.",
                        };
                      }
                    }}
                  />

                  <p className="text-xs text-text-light leading-relaxed">
                    Keine E-Mail erhalten? Prüfen Sie bitte auch Ihren Spam-Ordner.
                    Sollte die Adresse nicht mehr erreichbar sein, melden Sie sich über das
                    <a
                      href="/#kontakt"
                      className="text-primary underline underline-offset-4 ml-1"
                    >
                      Kontaktformular
                    </a>.
                  </p>
                </div>

                <div className="flex justify-end p-6 pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-white px-5 py-2.5 text-sm font-semibold text-text hover:bg-bg transition-colors"
                  >
                    Schließen
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function SummaryRow({
  icon,
  label,
  count,
  willBeDeleted,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  willBeDeleted: boolean;
  hint?: string;
}) {
  const effectiveHint =
    hint ??
    (count === 0
      ? "keine vorhanden"
      : willBeDeleted
        ? "werden gelöscht"
        : "bleiben erhalten");
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
      <span className="flex items-center gap-2 text-text">
        <span className="text-text-light">{icon}</span>
        {label}
      </span>
      <span className="flex items-center gap-3">
        <span className="font-semibold text-text">{count}</span>
        <span
          className={`text-xs ${
            willBeDeleted && count > 0 ? "text-red-700" : "text-text-light"
          }`}
        >
          {effectiveHint}
        </span>
      </span>
    </li>
  );
}
