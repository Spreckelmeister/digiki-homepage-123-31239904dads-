"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

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
      <div className="bg-white rounded-xl p-8 shadow-sm border border-border text-center">
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-colors"
            placeholder="ihre.email@schule.de"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 text-lg font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          <Mail className="w-5 h-5" aria-hidden="true" />
          {loading ? "Wird gesendet..." : "Link anfordern"}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-text-light">
        <Link
          href="/best-practice/login"
          className="text-primary-light underline hover:text-primary"
        >
          Zurück zur Anmeldung
        </Link>
      </div>
    </div>
  );
}
