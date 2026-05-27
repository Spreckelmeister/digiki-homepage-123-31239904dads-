"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MailWarning, RefreshCw, Clock3 } from "lucide-react";

interface Props {
  userId: string;
  currentEmail: string;
  emailConfirmedAt: string | null;
}

export default function ResendConfirmationButton({
  userId,
  currentEmail,
  emailConfirmedAt,
}: Props) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  // Hat der Nutzer seinen Account schon bestätigt, zeigen wir nichts an –
  // der Admin braucht hier dann keine Aktion.
  if (emailConfirmedAt) return null;

  async function handleResend() {
    setSending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/resend-signup-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({
          type: "err",
          text:
            typeof json.error === "string"
              ? json.error
              : "Versand fehlgeschlagen.",
        });
        return;
      }
      setMessage({
        type: "ok",
        text: `Neue Bestätigungs-Mail an ${currentEmail} verschickt – mit 8-stelligem Code und 24-Stunden-Hinweis.`,
      });
      router.refresh();
    } catch {
      setMessage({ type: "err", text: "Netzwerkfehler." });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="relative isolate overflow-hidden rounded-xl border border-accent-strong/25 bg-white p-5 shadow-sm">
      {/* Atmosphärischer Akzent rechts oben */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full opacity-[0.10] blur-3xl"
        style={{ background: "var(--color-accent)" }}
      />

      <div className="relative">
        {/* Eyebrow mit Live-Puls */}
        <span className="inline-flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.2em] text-accent-strong">
          <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent-strong" />
          </span>
          Aktion erforderlich
        </span>

        <h2 className="mt-2 flex items-center gap-2 text-lg font-bold text-primary">
          <MailWarning className="h-5 w-5 shrink-0" aria-hidden="true" />
          E-Mail-Adresse noch nicht bestätigt
        </h2>

        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-light">
          Für{" "}
          <span className="font-mono text-text">{currentEmail}</span> wurde der
          Bestätigungs-Link bisher nicht eingelöst. Beim erneuten Versand
          informieren wir die Schule freundlich darüber, dass uns das
          aufgefallen ist, und legen einen 8-stelligen Code als Alternative
          bei – für den Fall, dass das Schul-Netzwerk Links blockiert.
        </p>

        <div className="mt-4 inline-flex items-center gap-2 rounded-md border border-border bg-bg px-3 py-1.5 text-[12px] text-text-light">
          <Clock3 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          <span>
            Link &amp; Code sind nach Versand{" "}
            <strong className="text-text">24 Stunden gültig</strong>.
          </span>
        </div>

        <div className="mt-5 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={handleResend}
            disabled={sending}
            className="group inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
          >
            <RefreshCw
              className={`h-4 w-4 ${sending ? "animate-spin" : "transition-transform group-hover:rotate-180"}`}
              aria-hidden="true"
            />
            {sending ? "Wird versendet..." : "Bestätigungs-Mail erneut senden"}
          </button>

          {message && (
            <p
              role="status"
              className={`text-sm leading-snug ${
                message.type === "ok" ? "text-green-700" : "text-red-700"
              }`}
            >
              {message.text}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
