"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Cloud,
  ShieldCheck,
  Sparkles,
  X,
  Server,
  Lock,
  CheckCircle2,
  Smartphone,
  Network,
  Mail,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const WIZARD_DONE_KEY = "digiki.klassenverteilung.wizardDone.v1";

type AuthState = "unknown" | "anon" | "authed";

interface Props {
  /** Wenn true: Wizard wird gezeigt, auch wenn Flag schon gesetzt ist (z. B. „Tutorial wieder anzeigen") */
  forceOpen?: boolean;
  onClose?: () => void;
}

export default function SetupWizard({ forceOpen, onClose }: Props) {
  const [auth, setAuth] = useState<AuthState>("unknown");
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [hasSmtp, setHasSmtp] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  // Auth + State Discovery
  // Open-Logic — läuft IMMER beim Mount, unabhängig vom Auth-Status.
  // Erste Besucher (typischerweise nicht eingeloggt) sollen das Tutorial
  // sehen, damit sie die Online-Funktionen überhaupt kennenlernen.
  useEffect(() => {
    if (forceOpen) {
      setOpen(true);
      return;
    }
    if (typeof window === "undefined") return;
    const seen = window.localStorage.getItem(WIZARD_DONE_KEY) === "1";
    if (!seen) setOpen(true);
  }, [forceOpen]);

  // Auth + Setup-Status separat ermitteln (für Step 2 + 3 Anpassung).
  // Schlägt diese Discovery fehl, bleibt das Wizard trotzdem offen –
  // es ist robust gegenüber 401/500/Netzwerkfehlern.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, m] = await Promise.all([
          fetch("/api/klassenbildung/session"),
          fetch("/api/klassenbildung/smtp"),
        ]);
        if (cancelled) return;
        if (s.status === 401 || m.status === 401) {
          setAuth("anon");
          setHasSession(false);
          setHasSmtp(false);
          return;
        }
        setAuth("authed");
        if (s.ok) {
          const json = await s.json();
          setHasSession((json.sessions ?? []).length > 0);
        } else {
          setHasSession(false);
        }
        if (m.ok) {
          const json = await m.json();
          setHasSmtp(!!json.config);
        } else {
          setHasSmtp(false);
        }
      } catch {
        if (!cancelled) {
          setAuth("anon");
          setHasSession(false);
          setHasSmtp(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const close = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(WIZARD_DONE_KEY, "1");
    }
    setOpen(false);
    onClose?.();
  };

  if (!open) return null;

  const totalSteps = 3;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="setup-wizard-title"
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-3 py-3 sm:py-8"
    >
      <div
        className="relative w-full max-w-xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
        style={{ animation: "wizard-in 320ms cubic-bezier(0.22,0.61,0.36,1) both" }}
      >
        {/* Top accent stripe */}
        <div
          aria-hidden="true"
          className="h-1.5 bg-gradient-to-r from-primary via-primary-light to-accent"
        />

        {/* Header mit Schritt-Indikator + Skip-Button */}
        <header className="flex items-center gap-3 px-5 sm:px-7 pt-5 pb-3">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <span
                key={i}
                aria-hidden="true"
                className={`h-1.5 rounded-full transition-all ${
                  i < step
                    ? "w-6 bg-primary"
                    : i === step
                      ? "w-10 bg-accent-strong"
                      : "w-6 bg-border"
                }`}
              />
            ))}
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-light">
            Schritt {step + 1} / {totalSteps}
          </span>
          <button
            type="button"
            onClick={close}
            aria-label="Tutorial schließen"
            className="ml-auto inline-flex items-center gap-1 rounded-md text-text-light hover:text-primary hover:bg-bg p-1.5 transition-colors"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            <span className="text-xs font-bold">Überspringen</span>
          </button>
        </header>

        {/* Content – switches per step */}
        <div className="px-5 sm:px-7 pb-5 sm:pb-7 max-h-[70vh] sm:max-h-[78vh] overflow-y-auto">
          {step === 0 && <StepWelcome />}
          {step === 1 && <StepSmtp hasSmtp={!!hasSmtp} />}
          {step === 2 && <StepOnline />}
        </div>

        {/* Footer / Navigation */}
        <footer className="flex items-center gap-3 border-t border-border bg-bg/30 px-5 sm:px-7 py-3.5">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="inline-flex items-center gap-1 text-xs font-bold text-text-light hover:text-primary transition-colors"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Zurück
            </button>
          ) : (
            <button
              type="button"
              onClick={close}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-text-light hover:text-text underline-offset-2 hover:underline transition-colors"
            >
              Offline fortfahren
            </button>
          )}
          <div className="ml-auto">
            {step < totalSteps - 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-white px-4 py-2 text-sm font-bold hover:bg-primary/90 transition-colors"
              >
                Weiter
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                onClick={close}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent text-text px-4 py-2 text-sm font-bold hover:bg-accent-hover transition-colors"
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Loslegen
              </button>
            )}
          </div>
        </footer>
      </div>

      <style>{`
        @keyframes wizard-in {
          from { opacity: 0; transform: translateY(16px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="wizard-in"] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

// ─── Step 1: Welcome ───────────────────────────────────────────────
function StepWelcome() {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-accent-strong mb-2 inline-flex items-center gap-2">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent-strong" />
        Willkommen
      </p>
      <h2 id="setup-wizard-title" className="text-2xl sm:text-3xl font-bold text-primary leading-tight tracking-tight mb-3">
        Klassenbildung — schneller mit Online-Anmeldung
      </h2>
      <p className="text-sm text-text leading-relaxed mb-5">
        Eltern scannen einen QR-Code an der Schule, tragen Wünsche selbst ein,
        Sie sehen alles live im Dashboard. Funktioniert weiterhin auch ganz
        lokal ohne Server – Sie entscheiden.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <FeatureBullet
          icon={<Smartphone className="h-4 w-4" aria-hidden="true" />}
          title="QR an der Schule"
          body="Ein Code, den Sie aushängen – Eltern füllen mobil aus."
        />
        <FeatureBullet
          icon={<Network className="h-4 w-4" aria-hidden="true" />}
          title="Live-Übersicht"
          body="Anmeldungen erscheinen sofort im Klassenverteilungs-Tool."
        />
        <FeatureBullet
          icon={<Mail className="h-4 w-4" aria-hidden="true" />}
          title="Eltern-E-Mails"
          body="Klassenzuteilung wird automatisch versendet."
        />
      </div>

      <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary mb-1.5 inline-flex items-center gap-1.5">
          <Lock className="h-3 w-3" aria-hidden="true" />
          DigiKI-Konto erforderlich
        </p>
        <p className="text-xs text-text leading-relaxed">
          Online-Anmeldungen sind an Ihr Konto gekoppelt — so sehen nur Sie die
          Eltern-Eingaben, und Sie können auch von einem anderen Gerät weiter
          arbeiten.
        </p>
      </div>
    </div>
  );
}

function FeatureBullet({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-bg/40 p-3">
      <div className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary mb-2">
        {icon}
      </div>
      <p className="text-sm font-bold text-text leading-tight">{title}</p>
      <p className="text-xs text-text-light leading-relaxed mt-0.5">{body}</p>
    </div>
  );
}

// ─── Step 2: SMTP (optional) ───────────────────────────────────────
function StepSmtp({ hasSmtp }: { hasSmtp: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-accent-strong mb-2 inline-flex items-center gap-2">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent-strong" />
        Optional · 2 Minuten
      </p>
      <h2 className="text-2xl font-bold text-primary leading-tight tracking-tight mb-3">
        Eltern-Mails über Ihren Schulserver
      </h2>
      <p className="text-sm text-text leading-relaxed mb-4">
        Klassenzuteilungs-Mails kommen mit <strong>Schul-Logo</strong> und
        Absender-Adresse Ihrer Schule – wirkt offizieller und vermeidet
        Spam-Filter.
      </p>

      {hasSmtp ? (
        <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4 mb-3">
          <CheckCircle2
            className="h-5 w-5 text-emerald-700 mb-1.5"
            aria-hidden="true"
          />
          <p className="text-sm font-bold text-emerald-900 mb-0.5">
            SMTP ist bereits eingerichtet
          </p>
          <p className="text-xs text-emerald-800 leading-relaxed">
            Sehr gut. Sie können diesen Schritt überspringen.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-bg/40 p-4 mb-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
              <Server className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-bold text-text mb-0.5">
                Wo Sie das einrichten:
              </p>
              <p className="text-xs text-text-light leading-relaxed">
                Auf der Klassenverteilungs-Seite, in der linken Spalte unter
                <strong> „Eigener Mail-Server"</strong>. Sie brauchen nur:
                Host, Port, Benutzer, Passwort, Absender-Adresse.
                Idealerweise verwenden Sie ein App-spezifisches Passwort.
              </p>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-text-light leading-relaxed border-l-2 border-border pl-3">
        Wenn Sie keinen eigenen SMTP-Server hinterlegen, verschickt DigiKI die
        E-Mails als Fallback. Nicht so vertrauenswürdig wirkend, aber
        funktional vollständig.
      </p>
    </div>
  );
}

// ─── Step 3: Online-Funktion finden ────────────────────────────────
function StepOnline() {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-accent-strong mb-2 inline-flex items-center gap-2">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent-strong" />
        Letzte Etappe
      </p>
      <h2 className="text-2xl font-bold text-primary leading-tight tracking-tight mb-3">
        So starten Sie eine Online-Anmeldung
      </h2>

      <ol className="space-y-3 text-sm text-text">
        <Step
          num="1"
          title={
            <>
              In der Sidebar zu <strong>„Online-Anmeldung"</strong> scrollen
            </>
          }
          icon={<Cloud className="h-4 w-4 text-primary" aria-hidden="true" />}
        >
          Direkt unter der Klassenliste. Dort einmal auf{" "}
          <em>„Neue Online-Anmeldung"</em> klicken.
        </Step>
        <Step
          num="2"
          title={<>Bezeichnung + Ansprechperson eintragen</>}
          icon={<Sparkles className="h-4 w-4 text-accent-strong" aria-hidden="true" />}
        >
          Ein Code wie <span className="font-mono">K3J9-X7P2</span> wird
          automatisch erzeugt. Eltern erreichen das Formular über eine URL
          mit diesem Code.
        </Step>
        <Step
          num="3"
          title={<>QR drucken oder URL aushängen</>}
          icon={<Smartphone className="h-4 w-4 text-primary" aria-hidden="true" />}
        >
          QR-Code an der Eingangstafel, im Sekretariat oder per E-Mail an
          die Eltern. Eltern scannen, tragen ein – Sie sehen Anmeldungen
          live.
        </Step>
        <Step
          num="4"
          title={<>Verteilung & Eltern-Mails</>}
          icon={<Mail className="h-4 w-4 text-primary" aria-hidden="true" />}
        >
          Per Klick alle Anmeldungen in das Tool übernehmen, Verteilung
          rechnen lassen, Eltern automatisch per E-Mail informieren.
        </Step>
      </ol>

      <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <ShieldCheck
          className="h-4 w-4 text-primary inline mr-1.5"
          aria-hidden="true"
        />
        <span className="text-xs text-text leading-relaxed">
          Lokal arbeiten geht weiterhin uneingeschränkt. Sie können auch
          beides kombinieren: Online-Anmeldungen importieren, dann lokal
          weiter justieren. Mehr unter{" "}
          <Link
            href="/datenschutz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline decoration-accent-strong/40 underline-offset-2 hover:decoration-accent-strong"
          >
            Datenschutz
          </Link>
          .
        </span>
      </div>
    </div>
  );
}

function Step({
  num,
  title,
  icon,
  children,
}: {
  num: string;
  title: React.ReactNode;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3 rounded-lg border border-border bg-white p-3">
      <span className="font-mono text-xs font-bold tabular-nums w-7 h-7 rounded-md bg-primary/10 text-primary inline-flex items-center justify-center shrink-0">
        {num}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text leading-snug inline-flex items-center gap-1.5 flex-wrap">
          {icon}
          {title}
        </p>
        <p className="text-xs text-text-light leading-relaxed mt-1">
          {children}
        </p>
      </div>
    </li>
  );
}
