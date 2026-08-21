"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { verifySignInCode } from "@/lib/auth/verifySignInCode";
import CodeVerifyBox from "@/components/auth/CodeVerifyBox";

/**
 * Inline-Bestätigung direkt auf dem Erfolgsbildschirm der Bestandsaufnahme
 * („Code statt Link"): Der frisch angelegte Account wird durch Eingabe des
 * per Mail verschickten Codes bestätigt UND der Nutzer ist danach direkt
 * angemeldet. Wer die Seite schließt, holt das später einfach beim
 * Code-Login nach (bestätigt die Adresse ebenfalls).
 */
export default function InlineSignupConfirm({ email }: { email: string }) {
  const [confirmed, setConfirmed] = useState(false);

  if (confirmed) {
    return (
      <div
        className="rounded-xl bg-green-50 border border-green-200 px-6 py-5 text-sm"
        role="status"
        aria-live="polite"
      >
        <p className="flex items-center justify-center gap-2 font-semibold text-green-800">
          <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
          E-Mail bestätigt – Sie sind jetzt angemeldet.
        </p>
        <p className="mt-3 text-center">
          <Link
            href="/best-practice/datenbank"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
          >
            Zur Best-Practice-Datenbank
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-accent/5 border border-accent/20 px-6 py-5 text-left">
      <p className="mb-1 flex items-center gap-2 font-semibold text-text">
        <MailCheck className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        Nur noch ein Schritt: E-Mail bestätigen
      </p>
      <p className="mb-4 text-sm text-text-light leading-relaxed">
        Geben Sie den 8-stelligen Code aus der E-Mail an{" "}
        <strong className="text-text">{email}</strong> ein – damit ist Ihr
        Account aktiv und Sie sind direkt angemeldet. Bitte prüfen Sie auch
        Ihren Spam-Ordner.
      </p>

      <CodeVerifyBox
        idPrefix="signup-confirm"
        submitLabel="Bestätigen & anmelden"
        loadingLabel="Wird geprüft …"
        startCooldownOnMount
        onVerify={async (code) => {
          const supabase = createClient();
          const result = await verifySignInCode(supabase, email, code);
          if (result.ok) {
            setConfirmed(true);
            return { ok: true };
          }
          if (result.kind === "expired") {
            return {
              ok: false,
              error:
                "Der Code ist abgelaufen. Bitte fordern Sie mit „Code erneut senden“ einen neuen an.",
            };
          }
          if (result.kind === "invalid") {
            return {
              ok: false,
              error:
                "Der Code ist nicht korrekt oder wurde bereits verwendet. Es gilt immer der Code aus der neuesten E-Mail.",
            };
          }
          return {
            ok: false,
            error: "Die Bestätigung ist fehlgeschlagen. Bitte versuchen Sie es erneut.",
          };
        }}
        onResend={async () => {
          try {
            const res = await fetch("/api/auth/request-login-code", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email }),
            });
            if (res.ok || res.status === 429) return { ok: true };
            return {
              ok: false,
              error:
                "Der Code konnte nicht gesendet werden. Bitte versuchen Sie es erneut.",
            };
          } catch {
            return {
              ok: false,
              error: "Netzwerkfehler. Bitte versuchen Sie es erneut.",
            };
          }
        }}
      />

      <p className="mt-4 text-xs text-text-light leading-relaxed">
        Später? Kein Problem – melden Sie sich einfach jederzeit unter{" "}
        <Link
          href="/best-practice/login"
          className="text-primary underline hover:text-primary/80"
        >
          Anmelden
        </Link>{" "}
        an: Sie erhalten dort automatisch einen neuen Code, und mit der
        Anmeldung wird Ihre Adresse bestätigt.
      </p>
    </div>
  );
}
