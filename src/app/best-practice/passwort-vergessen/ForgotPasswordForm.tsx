"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Mail, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const NIBIS_PATTERN = /\.nibis\.de\s*$/i;

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const isNibis = useMemo(() => NIBIS_PATTERN.test(email.trim()), [email]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;

    // Always show success regardless of outcome (don't reveal if email exists)
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/auth/callback?next=/best-practice/passwort-zuruecksetzen`,
    });

    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="bg-white rounded-xl p-8 shadow-sm border border-border text-center" role="status" aria-live="polite">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
          <Mail className="h-7 w-7 text-green-600" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold text-primary mb-2">
          E-Mail gesendet
        </h2>
        <p className="text-sm text-text-light mb-6">
          Falls ein Konto mit dieser Adresse existiert, haben wir Ihnen einen
          Link zum Zurücksetzen Ihres Passworts zugeschickt. Bitte prüfen Sie
          auch Ihren Spam-Ordner.
        </p>
        <div className="bg-bg border border-border rounded-lg p-4 mb-6 text-left">
          <p className="text-sm text-text mb-2">
            <strong>Link funktioniert nicht?</strong>
          </p>
          <p className="text-sm text-text-light mb-3">
            In der E-Mail finden Sie auch einen <strong>8-stelligen Code</strong>,
            den Sie stattdessen eingeben können.
          </p>
          <Link
            href="/best-practice/code-einloesen?type=recovery"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline hover:text-primary/80 transition-colors"
          >
            Zur Code-Eingabe
          </Link>
        </div>
        <Link
          href="/best-practice/login"
          className="text-sm text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
        >
          Zurück zur Anmeldung
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-8 shadow-sm border border-border">
      <p className="text-sm text-text-light mb-6">
        Geben Sie Ihre E-Mail-Adresse ein. Wir schicken Ihnen einen Link, mit
        dem Sie ein neues Passwort festlegen können.
      </p>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-text mb-1.5"
          >
            E-Mail-Adresse
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none transition-colors"
            placeholder="ihre.email@schule.de"
          />
          {isNibis && (
            <p className="mt-2 flex items-start gap-2 text-sm text-red-700" role="alert">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                An NIBIS-Adressen (<code className="font-mono text-xs">@*.nibis.de</code>) können aktuell
                keine Mails zugestellt werden. Bitte wenden Sie sich für das Zurücksetzen des Passworts an{" "}
                <a
                  href="mailto:krafft@osnabrueck.de"
                  className="underline hover:text-red-900"
                >
                  krafft@osnabrueck.de
                </a>
                .
              </span>
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 text-lg font-semibold text-text hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          <Mail className="w-5 h-5" aria-hidden="true" />
          {loading ? "Wird gesendet..." : "Link anfordern"}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-text-light">
        <Link
          href="/best-practice/login"
          className="text-primary underline hover:text-primary/80"
        >
          Zurück zur Anmeldung
        </Link>
      </div>
    </div>
  );
}
