"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Cloud,
  Plus,
  Copy,
  Check,
  X,
  Mail,
  Trash2,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Unlock,
  Download,
  RefreshCw,
  ExternalLink,
  Send,
  Server,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Settings2,
} from "lucide-react";
import QRCode from "qrcode";
import type {
  KlassenbildungRegistration,
  KlassenbildungSession,
} from "@/lib/klassenbildung/types";

interface Props {
  /** Aktiver lokaler Roster-Name – für die Vorbefüllung beim Erstellen */
  defaultName?: string;
  /** Wird aufgerufen, wenn die Lehrkraft Registrations in den lokalen Roster
   *  übernehmen will. Muss `studentLink`-Mapping zurückbringen, damit später
   *  eine Benachrichtigung möglich ist. */
  onImport: (
    sessionId: string,
    rosterName: string,
    registrations: KlassenbildungRegistration[]
  ) => void;
}

type AuthState = "unknown" | "anon" | "authed";

export default function OnlineSessions({ defaultName, onImport }: Props) {
  const [auth, setAuth] = useState<AuthState>("unknown");
  const [sessions, setSessions] = useState<KlassenbildungSession[] | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Listen erst laden wenn auth bestätigt ist
  const loadSessions = useCallback(async () => {
    setLoadErr(null);
    try {
      const res = await fetch("/api/klassenbildung/session");
      if (res.status === 401) {
        setAuth("anon");
        setSessions([]);
        return;
      }
      if (!res.ok) {
        // Aus Loading-State raus, damit der Spinner nicht hängt
        setAuth("authed");
        setSessions([]);
        const json = await res.json().catch(() => ({}));
        setLoadErr(
          json?.detail ??
            json?.error ??
            `Sessions konnten nicht geladen werden (HTTP ${res.status}). Sind die Migrations 015 + 016 in Supabase eingespielt?`
        );
        return;
      }
      const json = await res.json();
      setSessions(json.sessions ?? []);
      setAuth("authed");
    } catch (e) {
      // Auch bei Netzwerkfehler aus dem unknown-State raus
      setAuth("authed");
      setSessions([]);
      setLoadErr(
        e instanceof Error
          ? `Netzwerk-Fehler: ${e.message}`
          : "Netzwerk-Fehler beim Laden der Sessions."
      );
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const createSession = useCallback(
    async (
      name: string,
      schoolName: string,
      maxWishes: number,
      contactName: string,
      contactEmail: string
    ) => {
      setCreating(true);
      try {
        const res = await fetch("/api/klassenbildung/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            school_name: schoolName.trim() || undefined,
            max_wishes: maxWishes,
            contact_name: contactName.trim() || undefined,
            contact_email: contactEmail.trim() || undefined,
          }),
        });
        if (res.status === 401) {
          setAuth("anon");
          return null;
        }
        if (!res.ok) {
          alert("Erstellen fehlgeschlagen.");
          return null;
        }
        const json = await res.json();
        const created = json.session as KlassenbildungSession;
        setSessions((p) => [created, ...(p ?? [])]);
        setActiveSessionId(created.id);
        return created;
      } finally {
        setCreating(false);
      }
    },
    []
  );

  // ── Anonyme Lehrkraft → Hinweis aufs Login ─────────────────────────
  if (auth === "anon") {
    return (
      <div className="rounded-xl bg-white border border-border p-4 shadow-sm">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-text-light mb-2">
          <Cloud className="h-3.5 w-3.5" aria-hidden="true" />
          Online-Anmeldung
        </p>
        <p className="text-xs text-text-light leading-relaxed mb-3">
          Mit Login: Sie hängen einen QR-Code an die Schule, Eltern tragen
          ihr Kind und Wünsche ein, das Dashboard hier zeigt alles live.
        </p>
        <Link
          href="/best-practice/login"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-xs font-bold text-primary hover:bg-primary/5 transition-colors"
        >
          <Lock className="h-3.5 w-3.5" aria-hidden="true" />
          Login öffnen
        </Link>
      </div>
    );
  }

  if (auth === "unknown") {
    return (
      <div className="rounded-xl bg-white border border-border p-4 shadow-sm">
        <p className="inline-flex items-center gap-1.5 text-xs text-text-light">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          Online-Sessions werden geladen…
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl bg-white border border-border p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-text-light">
            <Cloud className="h-3.5 w-3.5" aria-hidden="true" />
            Online-Anmeldung
          </p>
          <button
            type="button"
            onClick={loadSessions}
            aria-label="Sessions neu laden"
            className="text-text-light hover:text-primary p-1"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>

        {loadErr && (
          <p className="text-xs text-red-700">
            <AlertTriangle className="inline h-3 w-3 mr-1" aria-hidden="true" />
            {loadErr}
          </p>
        )}

        <CreateSessionForm
          defaultName={defaultName}
          onCreate={createSession}
          creating={creating}
        />

        {sessions && sessions.length > 0 && (
          <ul className="space-y-1 max-h-44 overflow-y-auto -mx-1 px-1">
            {sessions.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setActiveSessionId(s.id)}
                  className="w-full text-left rounded-md px-2.5 py-2 hover:bg-primary/5 transition-colors flex items-center gap-2"
                >
                  <span
                    aria-hidden="true"
                    className={`inline-block h-2 w-2 rounded-full shrink-0 ${
                      s.status === "open"
                        ? "bg-emerald-500"
                        : s.status === "closed"
                          ? "bg-amber-500"
                          : "bg-text-light"
                    }`}
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-bold truncate">
                      {s.name}
                    </span>
                    <span className="block text-[10px] font-mono text-text-light">
                      {s.code} · {labelForStatus(s.status)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* SMTP-Konfiguration für Schul-gebrandete Mails */}
      <SmtpConfigPanel />

      {activeSessionId && (
        <SessionDrawer
          sessionId={activeSessionId}
          onClose={() => setActiveSessionId(null)}
          onImport={(s, rosterName, regs) => {
            onImport(s, rosterName, regs);
            setActiveSessionId(null);
          }}
          onChange={loadSessions}
        />
      )}
    </>
  );
}

function labelForStatus(status: KlassenbildungSession["status"]): string {
  return status === "open"
    ? "offen"
    : status === "closed"
      ? "geschlossen"
      : "zugeteilt";
}

// ════════════════════════════════════════════════════════════════════════
// Create form
// ════════════════════════════════════════════════════════════════════════

function CreateSessionForm({
  defaultName,
  onCreate,
  creating,
}: {
  defaultName?: string;
  onCreate: (
    n: string,
    s: string,
    m: number,
    contactName: string,
    contactEmail: string
  ) => void;
  creating: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName ?? "");
  const [schoolName, setSchoolName] = useState("");
  const [maxWishes, setMaxWishes] = useState(2);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [emailErr, setEmailErr] = useState(false);

  const submit = () => {
    setEmailErr(false);
    if (
      contactEmail.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())
    ) {
      setEmailErr(true);
      return;
    }
    onCreate(name, schoolName, maxWishes, contactName, contactEmail);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary text-white px-3 py-2 text-xs font-bold hover:bg-primary/90 transition-colors"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        Neue Online-Anmeldung
      </button>
    );
  }
  return (
    <div className="space-y-2 border-t border-border pt-3">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Bezeichnung (z. B. Einschulung 2026)"
        className="w-full rounded-lg border border-border bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none"
      />
      <input
        type="text"
        value={schoolName}
        onChange={(e) => setSchoolName(e.target.value)}
        placeholder="Schulname (optional)"
        className="w-full rounded-lg border border-border bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none"
      />
      <label className="block text-[10px] uppercase tracking-[0.15em] font-bold text-text-light">
        Max. Wünsche pro Kind: {maxWishes}
        <input
          type="range"
          min={1}
          max={5}
          value={maxWishes}
          onChange={(e) => setMaxWishes(parseInt(e.target.value, 10))}
          className="w-full accent-primary"
        />
      </label>
      <div className="rounded-lg border border-dashed border-border bg-bg/40 p-2.5 space-y-1.5 mt-1">
        <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-text-light">
          Ansprechperson für Eltern <span className="text-text-light/70 normal-case tracking-normal">(empfohlen, DSGVO)</span>
        </p>
        <input
          type="text"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          placeholder="Name (z. B. Frau Müller, Schulleitung)"
          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none"
        />
        <input
          type="email"
          value={contactEmail}
          onChange={(e) => {
            setContactEmail(e.target.value);
            if (emailErr) setEmailErr(false);
          }}
          placeholder="kontakt@schule.de"
          inputMode="email"
          autoComplete="email"
          className={`w-full rounded-lg border bg-white px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-accent-strong outline-none ${
            emailErr
              ? "border-red-400 focus:border-red-500"
              : "border-border focus:border-accent-strong"
          }`}
        />
        {emailErr && (
          <p className="text-[10px] text-red-700">
            Keine gültige E-Mail-Adresse.
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!name.trim() || creating}
          onClick={submit}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent text-text px-3 py-2 text-xs font-bold disabled:opacity-40 hover:bg-accent-hover transition-colors"
        >
          {creating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          Erstellen
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-border bg-white px-3 py-2 text-xs text-text-light hover:bg-bg transition-colors"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// Session-Drawer (rechte Seite, voll überlappend)
// ════════════════════════════════════════════════════════════════════════

function SessionDrawer({
  sessionId,
  onClose,
  onImport,
  onChange,
}: {
  sessionId: string;
  onClose: () => void;
  onImport: (
    sessionId: string,
    rosterName: string,
    regs: KlassenbildungRegistration[]
  ) => void;
  onChange: () => void;
}) {
  const [session, setSession] = useState<KlassenbildungSession | null>(null);
  const [registrations, setRegistrations] = useState<
    KlassenbildungRegistration[] | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/klassenbildung/session/${encodeURIComponent(sessionId)}`
      );
      if (!res.ok) {
        alert("Session konnte nicht geladen werden.");
        onClose();
        return;
      }
      const json = await res.json();
      setSession(json.session);
      setRegistrations(json.registrations ?? []);
    } finally {
      setLoading(false);
    }
  }, [sessionId, onClose]);

  useEffect(() => {
    reload();
  }, [reload]);

  // QR-Code für die öffentliche URL
  useEffect(() => {
    if (!session) return;
    const url = `${window.location.origin}/werkzeuge/klassenverteilung/anmeldung/${session.code}`;
    QRCode.toDataURL(url, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 480,
    }).then(setQr).catch(() => setQr(""));
  }, [session]);

  // Auto-Refresh alle 20s, solange offen
  useEffect(() => {
    if (!session || session.status !== "open") return;
    const id = setInterval(reload, 20_000);
    return () => clearInterval(id);
  }, [session, reload]);

  const url = session
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/werkzeuge/klassenverteilung/anmeldung/${session.code}`
    : "";

  const copyUrl = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* noop */
    }
  };

  const setStatus = async (status: "open" | "closed" | "assigned") => {
    if (!session) return;
    await fetch(`/api/klassenbildung/session/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await reload();
    onChange();
  };

  const removeSession = async () => {
    if (!session) return;
    if (
      !confirm(
        `Session „${session.name}" wirklich löschen? Alle Anmeldungen gehen verloren.`
      )
    )
      return;
    await fetch(`/api/klassenbildung/session/${session.id}`, {
      method: "DELETE",
    });
    onChange();
    onClose();
  };

  const removeRegistration = async (regId: string) => {
    if (!confirm("Anmeldung wirklich löschen?")) return;
    await fetch(
      `/api/klassenbildung/session/${sessionId}/registrations/${regId}`,
      { method: "DELETE" }
    );
    await reload();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex print:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Online-Anmeldung Details"
    >
      <button
        type="button"
        aria-label="Schließen"
        onClick={onClose}
        className="absolute inset-0 bg-black/30"
      />
      <div className="relative ml-auto w-full max-w-2xl bg-bg shadow-xl overflow-y-auto">
        <header className="sticky top-0 bg-primary text-white px-5 py-4 flex items-center gap-3 z-10">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
              Online-Anmeldung
            </p>
            <h2 className="text-lg font-bold leading-tight truncate">
              {session?.name ?? "…"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="text-white/80 hover:text-white p-1"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        {loading && (
          <div className="px-5 py-12 text-center text-text-light">
            <Loader2 className="h-5 w-5 animate-spin mx-auto" aria-hidden="true" />
          </div>
        )}

        {session && registrations && (
          <div className="px-5 py-5 space-y-5">
            {/* QR & URL */}
            <section className="rounded-xl bg-white border border-border p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-text-light mb-3">
                Eltern-Zugang
              </p>
              <div className="grid grid-cols-[auto_1fr] gap-4 items-start">
                <div className="border-2 border-text/15 rounded-lg p-2 bg-white">
                  {qr ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={qr} alt="QR-Code" width={140} height={140} />
                  ) : (
                    <div className="h-[140px] w-[140px]" />
                  )}
                </div>
                <div>
                  <p className="text-xs text-text-light mb-1">
                    Code zum Aushängen:
                  </p>
                  <p className="font-mono text-2xl font-bold text-primary tracking-tight mb-3">
                    {session.code}
                  </p>
                  <p className="text-xs text-text-light mb-1">URL:</p>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      readOnly
                      value={url}
                      onFocus={(e) => e.currentTarget.select()}
                      className="flex-1 min-w-0 rounded-md border border-border bg-bg/50 px-2 py-1.5 text-[11px] font-mono"
                    />
                    <button
                      type="button"
                      onClick={copyUrl}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2 py-1.5 text-[11px] font-bold text-primary hover:bg-bg transition-colors"
                    >
                      {copied ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-primary/80 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    Vorschau im neuen Tab
                  </a>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-2 items-center text-xs">
                <span className="text-text-light">Status:</span>
                <span
                  className={`font-bold ${
                    session.status === "open"
                      ? "text-emerald-700"
                      : session.status === "closed"
                        ? "text-amber-700"
                        : "text-text"
                  }`}
                >
                  {labelForStatus(session.status)}
                </span>
                <div className="ml-auto flex gap-1.5">
                  {session.status === "open" ? (
                    <button
                      type="button"
                      onClick={() => setStatus("closed")}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2 py-1 text-[11px] font-bold hover:bg-bg transition-colors"
                    >
                      <Lock className="h-3 w-3" aria-hidden="true" />
                      Schließen
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setStatus("open")}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2 py-1 text-[11px] font-bold hover:bg-bg transition-colors"
                    >
                      <Unlock className="h-3 w-3" aria-hidden="true" />
                      Öffnen
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={removeSession}
                    aria-label="Session löschen"
                    className="inline-flex items-center gap-1 rounded-md border border-red-300 bg-white px-2 py-1 text-[11px] font-bold text-red-700 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </section>

            {/* Registrations */}
            <section className="rounded-xl bg-white border border-border overflow-hidden">
              <header className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div>
                  <p className="text-sm font-bold text-primary">
                    Anmeldungen ({registrations.length})
                  </p>
                  <p className="text-[11px] text-text-light">
                    Aktualisiert sich alle 20 Sek. automatisch
                  </p>
                </div>
                <button
                  type="button"
                  onClick={reload}
                  className="text-text-light hover:text-primary p-1"
                  aria-label="Neu laden"
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                </button>
              </header>
              {registrations.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-text-light">
                  Noch keine Anmeldungen eingegangen.
                </p>
              ) : (
                <ul className="divide-y divide-border max-h-96 overflow-y-auto">
                  {registrations.map((r) => (
                    <li key={r.id} className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs shrink-0 ${
                            r.gender === "m"
                              ? "bg-blue-100 text-blue-700"
                              : r.gender === "w"
                                ? "bg-pink-100 text-pink-800"
                                : "bg-bg text-text-light"
                          }`}
                          aria-hidden="true"
                        >
                          {r.gender === "m" ? "♂" : r.gender === "w" ? "♀" : "—"}
                        </span>
                        <p className="text-sm font-bold flex-1 min-w-0 truncate">
                          {r.child_name}
                        </p>
                        {r.parent_email && (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] text-text-light"
                            title={r.parent_email}
                          >
                            <Mail className="h-3 w-3" aria-hidden="true" />
                            E-Mail
                          </span>
                        )}
                        {r.assigned_class != null && (
                          <span className="inline-flex items-center rounded bg-primary/10 text-primary px-1.5 py-0.5 text-[10px] font-bold">
                            Kl. {r.assigned_class}
                          </span>
                        )}
                        {r.notified_at && (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-100 text-emerald-800 px-1.5 py-0.5 text-[10px] font-bold">
                            <Send className="h-2.5 w-2.5" aria-hidden="true" />
                            Mail gesendet
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeRegistration(r.id)}
                          aria-label={`${r.child_name} löschen`}
                          className="text-text-light hover:text-red-700 p-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                      {(r.wishes.length > 0 ||
                        r.no_go.length > 0 ||
                        r.siblings.length > 0 ||
                        r.notes) && (
                        <div className="mt-1.5 ml-8 text-[11px] text-text-light leading-relaxed space-y-0.5">
                          {r.wishes.length > 0 && (
                            <p>
                              <span className="text-emerald-700">💚</span>{" "}
                              {r.wishes.join(", ")}
                            </p>
                          )}
                          {r.no_go.length > 0 && (
                            <p>
                              <span className="text-red-600">🚫</span>{" "}
                              {r.no_go.join(", ")}
                            </p>
                          )}
                          {r.siblings.length > 0 && (
                            <p>
                              <span className="text-violet-700">👫</span>{" "}
                              {r.siblings.join(", ")}
                            </p>
                          )}
                          {r.notes && (
                            <p className="italic">„{r.notes}"</p>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {registrations.length > 0 && (
              <button
                type="button"
                onClick={() => onImport(session.id, session.name, registrations)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-accent text-text px-4 py-3 text-sm font-bold hover:bg-accent-hover transition-colors"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                {registrations.length} Anmeldung{registrations.length === 1 ? "" : "en"}{" "}
                in lokale Klassenliste übernehmen
              </button>
            )}

            <p className="text-[11px] text-text-light leading-relaxed border-l-2 border-border pl-3">
              Tipp: Nach der Klassenverteilung im Schritt „Ergebnis" können Sie
              die Eltern automatisch per E-Mail über die Zuteilung informieren.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// SMTP-Konfiguration: eigener Schul-Mailserver
// Visuelle Sprache: „Schaltschrank" – präzise Felder, LED-Statusanzeige,
// Live-Branding-Vorschau. Klein, aber distinct.
// ════════════════════════════════════════════════════════════════════════

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  smtp_user: string;
  from_email: string;
  from_name: string | null;
  reply_to: string | null;
  school_name: string | null;
  school_logo_url: string | null;
  verified_at: string | null;
  last_test_at: string | null;
  last_test_error: string | null;
}

function SmtpConfigPanel() {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<SmtpConfig | null>(null);
  const [encReady, setEncReady] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [auth, setAuth] = useState<"unknown" | "anon" | "authed">("unknown");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/klassenbildung/smtp");
      if (res.status === 401) {
        setAuth("anon");
        return;
      }
      if (!res.ok) {
        setAuth("authed");
        setConfig(null);
        return;
      }
      const json = await res.json();
      setConfig(json.config ?? null);
      setEncReady(!!json.encryption_ready);
      setAuth("authed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (auth !== "authed") return null; // Panel nur für angemeldete Lehrkräfte

  const status: "off" | "configured" | "verified" =
    !config ? "off" : config.verified_at ? "verified" : "configured";

  return (
    <div className="rounded-xl bg-white border border-border shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-bg/40 transition-colors"
      >
        <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
          <Server className="h-4 w-4 text-primary" aria-hidden="true" />
          <span
            aria-hidden="true"
            className={`absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${
              status === "verified"
                ? "bg-emerald-500"
                : status === "configured"
                  ? "bg-amber-500"
                  : "bg-text-light/40"
            }`}
          />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-text-light leading-none">
            Eigener Mail-Server
          </p>
          <p className="text-sm font-bold text-text leading-tight mt-1 truncate">
            {status === "off" && "Nicht eingerichtet"}
            {status === "configured" && "Eingerichtet · ungeprüft"}
            {status === "verified" && "Aktiv · verifiziert"}
          </p>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-text-light" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-4 w-4 text-text-light" aria-hidden="true" />
        )}
      </button>

      {open && (
        <div className="border-t border-border p-4 space-y-4">
          {loading ? (
            <p className="text-xs text-text-light inline-flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              Lade…
            </p>
          ) : encReady === false ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 leading-relaxed">
              <AlertTriangle className="inline h-3.5 w-3.5 mr-1" aria-hidden="true" />
              Verschlüsselung nicht eingerichtet. Bitte
              <strong> SMTP_ENCRYPTION_KEY</strong> (32 Bytes, base64) auf dem
              Server setzen, damit Passwörter sicher gespeichert werden können.
            </div>
          ) : !config && !editing ? (
            <SmtpEmptyState
              onStart={() => setEditing(true)}
              encReady={encReady}
            />
          ) : editing ? (
            <SmtpForm
              initial={config}
              onCancel={() => setEditing(false)}
              onSaved={() => {
                setEditing(false);
                load();
              }}
            />
          ) : config ? (
            <SmtpView
              config={config}
              onEdit={() => setEditing(true)}
              onTest={async () => {
                const res = await fetch("/api/klassenbildung/smtp/test", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({}),
                });
                const json = await res.json().catch(() => ({}));
                if (!res.ok) {
                  alert(`Test fehlgeschlagen: ${json?.detail ?? json?.error ?? "Unbekannter Fehler"}`);
                } else {
                  alert(`Test-Mail erfolgreich an ${json.target} gesendet.`);
                }
                load();
              }}
              onDelete={async () => {
                if (
                  !confirm(
                    "Eigenen Mail-Server entfernen? Klassen-Mails laufen dann wieder über DigiKI."
                  )
                )
                  return;
                await fetch("/api/klassenbildung/smtp", { method: "DELETE" });
                load();
              }}
            />
          ) : null}

          <p className="text-[10px] text-text-light leading-relaxed border-l-2 border-border pl-2">
            Wenn eingerichtet, gehen Klassenzuteilungs-Mails an Eltern über
            Ihren Schulserver — mit Schul-Logo und Absender-Adresse Ihrer
            Schule. Andernfalls verschickt DigiKI die Mails als Fallback.
          </p>
        </div>
      )}
    </div>
  );
}

function SmtpEmptyState({
  onStart,
  encReady,
}: {
  onStart: () => void;
  encReady: boolean | null;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-text leading-relaxed">
        Eltern erhalten die Klassen­zuteilung mit{" "}
        <strong>Schul-Logo</strong> und Absender-Adresse Ihrer Schule —
        rechtssicher und vertrauenswürdig.
      </p>
      <button
        type="button"
        onClick={onStart}
        disabled={!encReady}
        className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary text-white px-3 py-2 text-xs font-bold hover:bg-primary/90 transition-colors disabled:opacity-40"
      >
        <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
        SMTP-Server einrichten
      </button>
    </div>
  );
}

function SmtpView({
  config,
  onEdit,
  onTest,
  onDelete,
}: {
  config: SmtpConfig;
  onEdit: () => void;
  onTest: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="space-y-3">
      <dl className="space-y-1.5 text-[12px]">
        <Row label="Server">
          <span className="font-mono">
            {config.host}:{config.port}
            {config.secure && (
              <span className="ml-1 text-emerald-700">
                <Lock className="inline h-2.5 w-2.5" aria-hidden="true" /> SSL
              </span>
            )}
          </span>
        </Row>
        <Row label="Absender">
          <span className="font-mono break-all">
            {config.from_name && (
              <span className="text-text-light">{config.from_name} · </span>
            )}
            {config.from_email}
          </span>
        </Row>
        {config.reply_to && (
          <Row label="Antworten an">
            <span className="font-mono break-all">{config.reply_to}</span>
          </Row>
        )}
        {config.school_name && (
          <Row label="Schule">{config.school_name}</Row>
        )}
        {config.last_test_error && (
          <div className="rounded-md border border-red-300 bg-red-50 px-2 py-1.5 text-[11px] text-red-900 mt-1">
            <AlertTriangle className="inline h-3 w-3 mr-1" aria-hidden="true" />
            Letzter Test fehlgeschlagen: {config.last_test_error}
          </div>
        )}
      </dl>

      {/* Branding Mini-Preview */}
      {config.school_logo_url && (
        <div className="rounded-lg border border-border bg-bg/40 p-3">
          <p className="text-[10px] uppercase tracking-[0.15em] text-text-light mb-2">
            Vorschau
          </p>
          <div className="rounded-md bg-primary px-3 py-2 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={config.school_logo_url}
              alt={config.school_name ?? "Schul-Logo"}
              className="max-h-10 object-contain"
            />
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onTest}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent text-text px-3 py-2 text-xs font-bold hover:bg-accent-hover transition-colors"
        >
          <Send className="h-3.5 w-3.5" aria-hidden="true" />
          Test-Mail senden
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="rounded-lg border border-border bg-white px-3 py-2 text-xs font-bold text-primary hover:bg-bg transition-colors"
          aria-label="SMTP bearbeiten"
        >
          <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label="SMTP löschen"
          className="rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-light shrink-0 w-20">
        {label}
      </dt>
      <dd className="text-text flex-1 min-w-0">{children}</dd>
    </div>
  );
}

function SmtpForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial: SmtpConfig | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [host, setHost] = useState(initial?.host ?? "");
  const [port, setPort] = useState(String(initial?.port ?? 587));
  const [secure, setSecure] = useState(initial?.secure ?? false);
  const [smtpUser, setSmtpUser] = useState(initial?.smtp_user ?? "");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [fromEmail, setFromEmail] = useState(initial?.from_email ?? "");
  const [fromName, setFromName] = useState(initial?.from_name ?? "");
  const [replyTo, setReplyTo] = useState(initial?.reply_to ?? "");
  const [schoolName, setSchoolName] = useState(initial?.school_name ?? "");
  const [schoolLogoUrl, setSchoolLogoUrl] = useState(
    initial?.school_logo_url ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const save = async () => {
    setErrMsg("");
    setSaving(true);
    try {
      const res = await fetch("/api/klassenbildung/smtp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host,
          port: parseInt(port, 10),
          secure,
          smtp_user: smtpUser,
          password: password || undefined,
          from_email: fromEmail,
          from_name: fromName,
          reply_to: replyTo,
          school_name: schoolName,
          school_logo_url: schoolLogoUrl,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrMsg(json?.detail ?? json?.error ?? "Speichern fehlgeschlagen.");
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <FormRow label="Mail-Server (Host)">
        <input
          type="text"
          value={host}
          onChange={(e) => setHost(e.target.value)}
          placeholder="smtp.schule-musterstadt.de"
          className="w-full rounded-md border border-border bg-white px-2 py-1.5 text-xs focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none"
        />
      </FormRow>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <FormRow label="Port">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={port}
            onChange={(e) => setPort(e.target.value.replace(/[^0-9]/g, ""))}
            className="w-full rounded-md border border-border bg-white px-2 py-1.5 text-xs font-mono focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none"
          />
        </FormRow>
        <FormRow label="SSL">
          <button
            type="button"
            onClick={() => setSecure((s) => !s)}
            role="switch"
            aria-checked={secure}
            className={`inline-flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors ${
              secure ? "bg-primary" : "bg-text-light/30"
            }`}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                secure ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </FormRow>
      </div>
      <FormRow label="SMTP-Benutzer">
        <input
          type="text"
          value={smtpUser}
          onChange={(e) => setSmtpUser(e.target.value)}
          placeholder="post@schule-musterstadt.de"
          autoComplete="username"
          className="w-full rounded-md border border-border bg-white px-2 py-1.5 text-xs font-mono focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none"
        />
      </FormRow>
      <FormRow
        label={
          <>
            Passwort
            {initial && (
              <span className="ml-2 text-[9px] font-normal normal-case tracking-normal text-text-light">
                (leer lassen = unverändert)
              </span>
            )}
          </>
        }
      >
        <div className="relative">
          <input
            type={showPw ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            className="w-full rounded-md border border-border bg-white pl-2 pr-9 py-1.5 text-xs font-mono focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none"
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            aria-label={showPw ? "Passwort verbergen" : "Passwort anzeigen"}
            className="absolute top-1/2 -translate-y-1/2 right-1.5 text-text-light hover:text-primary p-1"
          >
            {showPw ? (
              <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>
        </div>
      </FormRow>

      <div className="border-t border-border pt-3 mt-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-light mb-2">
          Branding & Absender
        </p>
        <div className="space-y-2.5">
          <FormRow label="Absender-Adresse">
            <input
              type="email"
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              placeholder="klassenbildung@schule-musterstadt.de"
              className="w-full rounded-md border border-border bg-white px-2 py-1.5 text-xs font-mono focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none"
            />
          </FormRow>
          <FormRow label="Absender-Name (optional)">
            <input
              type="text"
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              placeholder="z. B. Schulleitung Mustergrundschule"
              className="w-full rounded-md border border-border bg-white px-2 py-1.5 text-xs focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none"
            />
          </FormRow>
          <FormRow label="Antworten an (optional)">
            <input
              type="email"
              value={replyTo}
              onChange={(e) => setReplyTo(e.target.value)}
              placeholder="schulleitung@schule-musterstadt.de"
              className="w-full rounded-md border border-border bg-white px-2 py-1.5 text-xs font-mono focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none"
            />
          </FormRow>
          <FormRow label="Schulname (optional)">
            <input
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="Mustergrundschule Osnabrück"
              className="w-full rounded-md border border-border bg-white px-2 py-1.5 text-xs focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none"
            />
          </FormRow>
          <FormRow label="Logo-URL (optional)">
            <input
              type="url"
              value={schoolLogoUrl}
              onChange={(e) => setSchoolLogoUrl(e.target.value)}
              placeholder="https://schule-musterstadt.de/logo.png"
              className="w-full rounded-md border border-border bg-white px-2 py-1.5 text-xs font-mono focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none"
            />
          </FormRow>
        </div>
      </div>

      {errMsg && (
        <p
          role="alert"
          className="text-xs text-red-700 bg-red-50 border border-red-300 rounded-md p-2 leading-relaxed"
        >
          <AlertTriangle className="inline h-3.5 w-3.5 mr-1" aria-hidden="true" />
          {errMsg}
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={save}
          disabled={
            saving ||
            !host ||
            !port ||
            !smtpUser ||
            !fromEmail ||
            (!initial && !password)
          }
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent text-text px-3 py-2 text-xs font-bold hover:bg-accent-hover transition-colors disabled:opacity-40"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          Speichern
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-border bg-white px-3 py-2 text-xs text-text-light hover:bg-bg transition-colors"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      <p className="text-[10px] text-text-light leading-relaxed border-l-2 border-amber-300 pl-2 mt-2">
        <strong>Tipp:</strong> Verwenden Sie nach Möglichkeit ein
        App-spezifisches Passwort (z. B. bei IONOS, Microsoft 365). Das
        Passwort wird AES-256-GCM-verschlüsselt gespeichert.
      </p>
    </div>
  );
}

function FormRow({
  label,
  children,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] font-bold uppercase tracking-[0.15em] text-text-light mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}
