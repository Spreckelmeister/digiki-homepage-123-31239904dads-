"use client";

import { useEffect, useState } from "react";
import { Check, Clock3, MailWarning, RefreshCw, Send } from "lucide-react";
import { getResendBlock, formatCooldown } from "@/lib/auth/resendCooldown";

interface Props {
  userId: string;
  schoolName: string;
  /** ISO-Zeitstempel des letzten Resend – `null` wenn noch nie versendet. */
  lastResendAt: string | null;
  /** ISO-Zeitstempel der ursprünglichen Anmeldung (Signup), für die
   *  Signup-Grace-Sperre. */
  signupAt?: string | null;
}

type State = "idle" | "sending" | "success" | "error";

/**
 * Kompakter Icon-Button für die Tabellen-Zeile. Triggert dieselbe
 * /api/admin/resend-signup-confirmation-Route wie der große Button im
 * Detail – nur mit kompakter Inline-Rückmeldung und 24h-Sperre.
 */
export default function ResendQuickAction({
  userId,
  schoolName,
  lastResendAt,
  signupAt,
}: Props) {
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Lokaler Versand-Zeitstempel – überschreibt nach einem erfolgreichen
  // Send-Klick den vom Server gelieferten Wert, ohne dass die Seite
  // neu geladen werden muss.
  const [localLastResend, setLocalLastResend] = useState<string | null>(
    lastResendAt,
  );
  const [localSignupAt, setLocalSignupAt] = useState<string | null>(
    signupAt ?? null,
  );

  // Cooldown jede Minute aktualisieren, damit der Tooltip live tickt.
  // Beim Erreichen der 24h fällt der Button automatisch in den Idle-State.
  const [cooldownTick, setCooldownTick] = useState(0);
  useEffect(() => {
    if (!localLastResend) return;
    const i = window.setInterval(() => setCooldownTick((v) => v + 1), 60_000);
    return () => window.clearInterval(i);
  }, [localLastResend]);

  const block = getResendBlock(localSignupAt, localLastResend);
  // cooldownTick wird hier nur als Re-Render-Trigger gelesen
  void cooldownTick;
  const isLocked = block !== null && state === "idle";

  async function handleClick() {
    if (state === "sending" || isLocked) return;
    setState("sending");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/resend-signup-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Sonderfall 429: Server hat 24h-Sperre durchgesetzt – Stempel
        // lokal auf den eigenen Server-Wert setzen, damit der Button
        // direkt in den Cooldown geht. Bei reason==='signup-grace' setzen
        // wir den lokalen Signup-Timestamp.
        if (res.status === 429 && typeof json.nextAvailableAt === "string") {
          if (json.reason === "signup-grace") {
            const inferredSignup = new Date(
              new Date(json.nextAvailableAt).getTime() - 24 * 60 * 60 * 1000,
            ).toISOString();
            setLocalSignupAt(inferredSignup);
          } else {
            const inferredLast = new Date(
              new Date(json.nextAvailableAt).getTime() - 24 * 60 * 60 * 1000,
            ).toISOString();
            setLocalLastResend(inferredLast);
          }
        }
        setState("error");
        setErrorMsg(
          typeof json.error === "string" ? json.error : "Versand fehlgeschlagen.",
        );
        window.setTimeout(() => setState("idle"), 4500);
        return;
      }
      // Erfolg: lokalen Cooldown sofort setzen
      setLocalLastResend(new Date().toISOString());
      setState("success");
      window.setTimeout(() => setState("idle"), 2200);
    } catch {
      setState("error");
      setErrorMsg("Netzwerkfehler.");
      window.setTimeout(() => setState("idle"), 4500);
    }
  }

  const baseClass =
    "inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-all";

  // ── Cooldown-Zustand ─────────────────────────────────────────────
  if (isLocked && block) {
    return (
      <button
        type="button"
        disabled
        aria-label={`Resend gesperrt – wieder möglich in ${block.formatted}`}
        title={`Erinnerungs-Mail wurde bereits versendet – neuer Versand erst in ${block.formatted} möglich (damit die Schule nicht mehrfach kontaktiert wird).`}
        className={`${baseClass} cursor-not-allowed border-border bg-bg text-text-light/60`}
      >
        <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    );
  }

  // ── Aktive Zustände (idle / sending / success / error) ──────────
  const titleByState: Record<State, string> = {
    idle: `Erinnerungs-Mail an „${schoolName}" senden`,
    sending: "Wird versendet …",
    success: `Erinnerungs-Mail an „${schoolName}" verschickt`,
    error: errorMsg ?? "Versand fehlgeschlagen.",
  };

  const classByState: Record<State, string> = {
    idle: "border-accent-strong/30 bg-accent/10 text-accent-strong hover:-translate-y-0.5 hover:border-accent-strong/55 hover:bg-accent/20 hover:shadow-sm",
    sending: "border-accent-strong/30 bg-accent/10 text-accent-strong cursor-wait",
    success: "border-green-300 bg-green-50 text-green-700 shadow-sm",
    error: "border-red-300 bg-red-50 text-red-700 shadow-sm",
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={state === "sending"}
      aria-label={titleByState[state]}
      aria-live="polite"
      title={titleByState[state]}
      className={`${baseClass} ${classByState[state]}`}
    >
      {state === "sending" && (
        <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      )}
      {state === "success" && (
        <Check className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {state === "error" && (
        <MailWarning className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {state === "idle" && (
        <Send className="h-3.5 w-3.5" aria-hidden="true" />
      )}
    </button>
  );
}

// Re-export für Konsumenten, die die formatierte Cooldown-Zeit direkt
// brauchen (z.B. ResendConfirmationButton im Detail).
export { formatCooldown };
