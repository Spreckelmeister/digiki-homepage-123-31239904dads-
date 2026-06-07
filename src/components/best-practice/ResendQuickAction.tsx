"use client";

import { useState } from "react";
import { Check, MailWarning, RefreshCw, Send } from "lucide-react";

interface Props {
  userId: string;
  schoolName: string;
}

type State = "idle" | "sending" | "success" | "error";

/**
 * Kompakter Icon-Button für die Tabellen-Zeile. Triggert dieselbe
 * /api/admin/resend-signup-confirmation-Route wie der große Button im
 * Detail – nur mit kompakter Inline-Rückmeldung (Spinner → Häkchen →
 * zurück zu Idle).
 */
export default function ResendQuickAction({ userId, schoolName }: Props) {
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleClick() {
    if (state === "sending") return;
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
        setState("error");
        setErrorMsg(
          typeof json.error === "string" ? json.error : "Versand fehlgeschlagen.",
        );
        // Nach 4s auto-reset, damit Admin erneut versuchen kann
        window.setTimeout(() => setState("idle"), 4000);
        return;
      }
      setState("success");
      window.setTimeout(() => setState("idle"), 2200);
    } catch {
      setState("error");
      setErrorMsg("Netzwerkfehler.");
      window.setTimeout(() => setState("idle"), 4000);
    }
  }

  const titleByState: Record<State, string> = {
    idle: `Bestätigungs-Mail an „${schoolName}" erneut senden`,
    sending: "Wird versendet …",
    success: `Bestätigungs-Mail an „${schoolName}" verschickt`,
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
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-all ${classByState[state]}`}
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
