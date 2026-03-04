"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [school, setSchool] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (password.length < 6) {
      setError("Das Passwort muss mindestens 6 Zeichen lang sein.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          school,
        },
      },
    });

    if (error) {
      setError("Registrierung fehlgeschlagen: " + error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);

    // If email confirmation is disabled, redirect directly
    setTimeout(() => {
      router.push("/best-practice/datenbank");
      router.refresh();
    }, 2000);
  }

  return (
    <>
      {/* Hero */}
      <section className="bg-primary py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Registrieren
          </h1>
          <p className="text-lg text-blue-200">
            Erstellen Sie ein Konto, um auf die Best-Practice-Datenbank
            zuzugreifen.
          </p>
        </div>
      </section>

      {/* Register Form */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-md px-4 sm:px-6">
          <div className="bg-white rounded-xl p-8 shadow-sm border border-border">
            {success ? (
              <div className="text-center py-6">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <UserPlus
                    className="h-6 w-6 text-green-600"
                    aria-hidden="true"
                  />
                </div>
                <h2 className="text-lg font-semibold text-primary mb-2">
                  Registrierung erfolgreich!
                </h2>
                <p className="text-sm text-text-light">
                  Sie werden zur Datenbank weitergeleitet...
                </p>
              </div>
            ) : (
              <>
                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
                      {error}
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="fullName"
                      className="block text-sm font-medium text-text mb-1.5"
                    >
                      Vollständiger Name
                    </label>
                    <input
                      id="fullName"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-colors"
                      placeholder="Max Mustermann"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="school"
                      className="block text-sm font-medium text-text mb-1.5"
                    >
                      Schule
                    </label>
                    <input
                      id="school"
                      type="text"
                      required
                      value={school}
                      onChange={(e) => setSchool(e.target.value)}
                      className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-colors"
                      placeholder="Grundschule Beispielstadt"
                    />
                  </div>

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

                  <div>
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-text mb-1.5"
                    >
                      Passwort (mind. 6 Zeichen)
                    </label>
                    <input
                      id="password"
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-colors"
                      placeholder="Mindestens 6 Zeichen"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 text-lg font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
                  >
                    <UserPlus className="w-5 h-5" aria-hidden="true" />
                    {loading ? "Wird registriert..." : "Registrieren"}
                  </button>
                </form>

                <div className="mt-6 text-center text-sm text-text-light">
                  <p>
                    Bereits registriert?{" "}
                    <Link
                      href="/best-practice/login"
                      className="text-primary-light underline hover:text-primary"
                    >
                      Zur Anmeldung
                    </Link>
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
