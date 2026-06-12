"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Clock3, MailWarning, RefreshCw } from "lucide-react";
import { getResendBlock } from "@/lib/auth/resendCooldown";

interface Props {
  userId: string;
  currentEmail: string;
  emailConfirmedAt: string | null;
  /** ISO-Zeitstempel des letzten Resend – `null` wenn noch nie versendet. */
  lastResendAt: string | null;
  /** ISO-Zeitstempel der ursprünglichen Anmeldung (Signup), für die
   *  Signup-Grace-Sperre. */
  signupAt?: string | null;
}

const FMT_LONG = new Intl.DateTimeFormat("de-DE", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default function ResendConfirmationButton({
  userId,
  currentEmail,
  emailConfirmedAt,
  lastResendAt,
  signupAt,
}: Props) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  // Lokaler Resend-Zeitstempel überschreibt den Server-Wert nach einem
  // erfolgreichen Klick, ohne dass die Seite neu geladen werden muss.
  const [localLastResend, setLocalLastResend] = useState<string | null>(
    lastResendAt,
  );

  // Lokaler Signup-Zeitstempel (wird benötigt, um die "signup-grace" Sperre
  // clientseitig korrekt darzustellen). Initialisiert mit der Prop.
  const [localSignupAt, setLocalSignupAt] = useState<string | null>(
    signupAt ?? null,
  );

  // Admin-Override der 24h-Sperre (nur hier in der Detail-Karte, bewusst per
  // Haken + Warnhinweis).
  const [overrideChecked, setOverrideChecked] = useState(false);

  // Cooldown jede Minute neu berechnen, damit „verfügbar in X" live tickt.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!localLastResend) return;
    const i = window.setInterval(() => setTick((v) => v + 1), 60_000);
    return () => window.clearInterval(i);
  }, [localLastResend]);

  if (emailConfirmedAt) return null;

  const block = getResendBlock(localSignupAt, localLastResend);
  const isLocked = block !== null;
  // Senden möglich, wenn nicht gesperrt – oder gesperrt UND der Admin den
  // Override-Haken gesetzt hat.
  const canSend = !isLocked || overrideChecked;
  const overriding = isLocked && overrideChecked;

  async function handleResend() {
    if (!canSend || sending) return;
    setSending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/resend-signup-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, override: overrideChecked }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Server hat die 24h-Sperre durchgesetzt – lokal nachziehen
        if (res.status === 429 && typeof json.nextAvailableAt === "string") {
          // Wenn reason === 'signup-grace' ist, dann stammt nextAvailableAt
          // von signup + 24h. In diesem Fall setzen wir lokal den Signup-
          // Zeitstempel, sonst den letzten Resend.
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
        setMessage({
          type: "err",
          text:
            typeof json.error === "string"
              ? json.error
              : "Versand fehlgeschlagen.",
        });
        return;
      }
      setLocalLastResend(new Date().toISOString());
      // Haken zurücksetzen, damit ein erneutes Überschreiben bewusst erfolgt.
      setOverrideChecked(false);
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

        {/* Cooldown-Hinweis ODER 24h-Info-Pille */}
        {isLocked && block ? (
          <div className="mt-4 inline-flex items-start gap-2 rounded-lg border border-border bg-bg px-3.5 py-2.5 text-[12.5px] text-text-light">
            <Clock3
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary"
              aria-hidden="true"
            />
            <span>
              Eine Bestätigungs-Mail wurde bereits versendet
              {localLastResend && (
                <>
                  {" "}
                  (zuletzt am{" "}
                  <strong className="text-text">
                    {FMT_LONG.format(new Date(localLastResend))}
                  </strong>{" "}
                  Uhr)
                </>
              )}
              . Der Link aus dieser Mail ist noch{" "}
              <strong className="text-text">{block.formatted}</strong>{" "}
              gültig – aus Rücksicht auf die Schule sperren wir einen weiteren
              Versand bis dahin.
            </span>
          </div>
        ) : (
          <div className="mt-4 inline-flex items-center gap-2 rounded-md border border-border bg-bg px-3 py-1.5 text-[12px] text-text-light">
            <Clock3 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            <span>
              Link &amp; Code sind nach Versand{" "}
              <strong className="text-text">24 Stunden gültig</strong>.
            </span>
          </div>
        )}

        {/* Override: 24h-Sperre bewusst umgehen (mit Warnhinweis). */}
        {isLocked && (
          <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-3">
            <input
              type="checkbox"
              checked={overrideChecked}
              onChange={(e) => setOverrideChecked(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-amber-400 text-amber-700 focus:ring-amber-500"
            />
            <span className="text-[12.5px] leading-relaxed text-amber-900">
              <span className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                24-Stunden-Sperre überschreiben und trotzdem jetzt senden
              </span>
              <span className="mt-0.5 block text-amber-800">
                Die Schule erhält dann ggf. zwei Bestätigungs-Mails kurz
                hintereinander. Nur nutzen, wenn die vorherige Mail nachweislich
                nicht ankam oder der Link defekt war.
              </span>
            </span>
          </label>
        )}

        <div className="mt-5 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={handleResend}
            disabled={sending || !canSend}
            className={`group inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:bg-text-light/30 disabled:text-white/70 disabled:hover:translate-y-0 disabled:hover:shadow-sm ${overriding ? "bg-accent-strong hover:bg-accent-strong/90" : "bg-primary hover:bg-primary/90"}`}
          >
            {sending ? (
              <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : overriding ? (
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            ) : isLocked ? (
              <Clock3 className="h-4 w-4" aria-hidden="true" />
            ) : (
              <RefreshCw
                className="h-4 w-4 transition-transform group-hover:rotate-180"
                aria-hidden="true"
              />
            )}
            {sending
              ? "Wird versendet..."
              : overriding
                ? "Trotzdem jetzt senden"
                : isLocked && block
                  ? `Erneut möglich in ${block.formatted}`
                  : "Bestätigungs-Mail erneut senden"}
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
