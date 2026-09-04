"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  CONTACT_TOPICS,
  CONTACT_TOPIC_DEFAULT,
  MAX_MESSAGE_LENGTH,
} from "@/lib/kontakt";

/**
 * Öffentliches Kontaktformular (weiße Karte auf dunkler Kontakt-Sektion).
 * Anfragen landen über /api/kontakt in der Datenbank und werden im
 * Admin-Bereich bearbeitet; die absendende Person erhält automatisch
 * eine Eingangsbestätigung per E-Mail.
 */

const inputClass =
  "w-full rounded-lg border border-border bg-white px-4 py-3 text-sm text-text outline-none transition-colors focus:border-accent-strong focus:ring-2 focus:ring-accent-strong";
const labelClass = "mb-1.5 block text-sm font-medium text-text";

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [topic, setTopic] = useState<string>(CONTACT_TOPIC_DEFAULT);
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // Honeypot – bleibt für Menschen leer
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    email: string;
    mailSent: boolean;
  } | null>(null);
  const successRef = useRef<HTMLHeadingElement>(null);

  // Angemeldete Nutzer: Name, E-Mail und Schule aus Konto/Profil
  // vorbefüllen – aber nie überschreiben, was bereits getippt wurde.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (cancelled || !user) return;
        if (user.email) {
          setEmail((prev) => prev || user.email!);
        }
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, school")
          .eq("id", user.id)
          .single();
        if (cancelled || !profile) return;
        if (profile.full_name) {
          setName((prev) => prev || profile.full_name);
        }
        if (profile.school) {
          setSchoolName((prev) => prev || profile.school);
        }
      } catch {
        // Nicht angemeldet / Supabase nicht erreichbar → Formular bleibt leer.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSending(true);
    try {
      const res = await fetch("/api/kontakt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          school_name: schoolName,
          topic,
          message,
          website,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        setResult({ email: email.trim(), mailSent: Boolean(data.mailSent) });
        setTimeout(() => successRef.current?.focus(), 50);
      } else if (res.status === 429) {
        setError(
          "Von Ihrem Anschluss wurden gerade mehrere Nachrichten gesendet. Bitte warten Sie einige Minuten und versuchen Sie es dann erneut.",
        );
      } else {
        setError(
          "Ihre Nachricht konnte leider nicht gesendet werden. Bitte versuchen Sie es in ein paar Minuten noch einmal.",
        );
      }
    } catch {
      setError(
        "Ihre Nachricht konnte leider nicht gesendet werden. Bitte prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.",
      );
    } finally {
      setSending(false);
    }
  }

  function resetForm() {
    setResult(null);
    setMessage("");
    setError("");
  }

  if (result) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-lg md:p-8">
        <div className="flex items-start gap-3" role="status">
          <span
            aria-hidden="true"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700"
          >
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <div>
            <h3
              ref={successRef}
              tabIndex={-1}
              className="text-lg font-bold text-primary outline-none"
            >
              Vielen Dank für Ihre Nachricht!
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-text">
              Ihre Anfrage ist beim DigiKI-Team eingegangen und wird so schnell
              wie möglich bearbeitet.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-text-light">
              {result.mailSent
                ? `Eine Eingangsbestätigung ist unterwegs an ${result.email}.`
                : "Die automatische Eingangsbestätigung konnte nicht versendet werden – Ihre Nachricht ist aber angekommen."}
            </p>
            <button
              type="button"
              onClick={resetForm}
              className="mt-4 text-sm font-semibold text-primary underline underline-offset-2 hover:text-primary/80"
            >
              Weitere Nachricht senden
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl bg-white p-6 shadow-lg md:p-8"
      aria-labelledby="contact-form-heading"
    >
      <h3 id="contact-form-heading" className="text-lg font-bold text-primary">
        Nachricht an das DigiKI-Team
      </h3>
      <p className="mt-1 mb-6 text-sm text-text-light">
        Wir melden uns so schnell wie möglich bei Ihnen zurück.
      </p>

      {/* Honeypot – für Menschen unsichtbar und nicht fokussierbar */}
      <div className="sr-only" aria-hidden="true">
        <label htmlFor="contact_website">
          Bitte lassen Sie dieses Feld leer
        </label>
        <input
          id="contact_website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="contact_name" className={labelClass}>
            Ihr Name *
          </label>
          <input
            id="contact_name"
            type="text"
            required
            maxLength={150}
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="contact_email" className={labelClass}>
            E-Mail-Adresse *
          </label>
          <input
            id="contact_email"
            type="email"
            required
            maxLength={200}
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="contact_school" className={labelClass}>
            Schule <span className="text-text-light">(optional)</span>
          </label>
          <input
            id="contact_school"
            type="text"
            maxLength={200}
            autoComplete="organization"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            className={inputClass}
            placeholder="z.B. Grundschule Eversburg"
          />
        </div>
        <div>
          <label htmlFor="contact_topic" className={labelClass}>
            Ihr Anliegen
          </label>
          <select
            id="contact_topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className={inputClass}
          >
            {CONTACT_TOPICS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="contact_message" className={labelClass}>
            Ihre Nachricht *
          </label>
          <textarea
            id="contact_message"
            required
            rows={5}
            maxLength={MAX_MESSAGE_LENGTH}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className={inputClass + " resize-y"}
            placeholder="Wobei können wir Sie unterstützen?"
          />
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={sending}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 text-lg font-semibold text-text transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {sending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Wird gesendet …
          </>
        ) : (
          <>
            <Send className="h-4 w-4" aria-hidden="true" />
            Nachricht senden
          </>
        )}
      </button>

      <p className="mt-4 text-xs leading-relaxed text-text-light">
        Ihre Angaben verwenden wir ausschließlich zur Bearbeitung Ihrer
        Anfrage. Details finden Sie in der{" "}
        <Link
          href="/datenschutz"
          className="underline underline-offset-2 hover:text-primary"
        >
          Datenschutzerklärung
        </Link>
        .
      </p>
    </form>
  );
}
