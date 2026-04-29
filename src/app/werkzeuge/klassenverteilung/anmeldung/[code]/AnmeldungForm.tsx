"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Heart,
  Ban,
  Users,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Smartphone,
  Plus,
  X,
  Mail,
  UserCheck,
} from "lucide-react";
import type { PublicSessionInfo } from "@/lib/klassenbildung/types";

type Stage = "loading" | "notFound" | "closed" | "form" | "submitting" | "done" | "error";

export default function AnmeldungForm({ code }: { code: string }) {
  const [stage, setStage] = useState<Stage>("loading");
  const [session, setSession] = useState<PublicSessionInfo | null>(null);
  const [errMsg, setErrMsg] = useState<string>("");
  const [consent, setConsent] = useState(false);

  // Form state
  const [childName, setChildName] = useState("");
  const [gender, setGender] = useState<"m" | "w" | "x">("x");
  const [notes, setNotes] = useState("");
  const [prevClass, setPrevClass] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [wishes, setWishes] = useState<string[]>([]);
  const [noGo, setNoGo] = useState<string[]>([]);
  const [siblings, setSiblings] = useState<string[]>([]);
  const [wishInput, setWishInput] = useState("");
  const [noGoInput, setNoGoInput] = useState("");
  const [siblingInput, setSiblingInput] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/klassenbildung/public-session/${encodeURIComponent(code)}`
        );
        if (cancelled) return;
        if (res.status === 404) {
          setStage("notFound");
          return;
        }
        if (!res.ok) {
          setStage("error");
          return;
        }
        const json = await res.json();
        const s = json.session as PublicSessionInfo;
        setSession(s);
        if (s.status !== "open") setStage("closed");
        else setStage("form");
      } catch {
        if (!cancelled) setStage("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  const addChip = (
    value: string,
    list: string[],
    set: (v: string[]) => void,
    max: number,
    clear: () => void
  ) => {
    const v = value.trim();
    if (!v) return;
    if (list.length >= max) return;
    if (list.some((x) => x.toLowerCase() === v.toLowerCase())) {
      clear();
      return;
    }
    set([...list, v]);
    clear();
  };

  const removeChip = (
    name: string,
    list: string[],
    set: (v: string[]) => void
  ) => set(list.filter((x) => x !== name));

  const handleSubmit = async () => {
    if (!session) return;
    if (!childName.trim()) {
      setErrMsg("Bitte den Namen des Kindes angeben.");
      return;
    }
    if (!consent) {
      setErrMsg(
        "Bitte die Datenschutzhinweise bestätigen, bevor Sie absenden."
      );
      return;
    }
    setErrMsg("");
    setStage("submitting");
    try {
      const res = await fetch("/api/klassenbildung/registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_code: session.code,
          child_name: childName.trim(),
          gender,
          notes: notes.trim() || undefined,
          prev_class: prevClass.trim() || undefined,
          parent_email: parentEmail.trim() || undefined,
          parent_name: parentName.trim() || undefined,
          wishes,
          no_go: noGo,
          siblings,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setErrMsg(translateError(json?.error));
        setStage("form");
        return;
      }
      setStage("done");
    } catch {
      setErrMsg("Verbindung fehlgeschlagen. Bitte später erneut versuchen.");
      setStage("form");
    }
  };

  // ── States ─────────────────────────────────────────────────────────

  if (stage === "loading") {
    return (
      <CenteredCard>
        <p className="text-text-light">Lade Anmeldeformular…</p>
      </CenteredCard>
    );
  }

  if (stage === "notFound") {
    return (
      <CenteredCard>
        <AlertTriangle className="h-8 w-8 text-amber-600 mb-3" aria-hidden="true" />
        <h1 className="text-xl font-bold text-primary mb-2">
          Anmelde-Code nicht gefunden
        </h1>
        <p className="text-sm text-text-light leading-relaxed">
          Der Code <strong className="font-mono">{code}</strong> ist
          unbekannt. Bitte prüfen Sie den QR-Code an der Schule oder den auf
          dem Aushang gedruckten Code.
        </p>
      </CenteredCard>
    );
  }

  if (stage === "closed" || (session && session.status !== "open")) {
    return (
      <CenteredCard>
        <AlertTriangle className="h-8 w-8 text-amber-600 mb-3" aria-hidden="true" />
        <h1 className="text-xl font-bold text-primary mb-2">
          Anmeldung geschlossen
        </h1>
        <p className="text-sm text-text-light leading-relaxed">
          Die Anmeldung „{session?.name}" nimmt aktuell keine neuen Einträge
          mehr an. Bitte wenden Sie sich direkt an die Schule.
        </p>
      </CenteredCard>
    );
  }

  if (stage === "error") {
    return (
      <CenteredCard>
        <AlertTriangle className="h-8 w-8 text-red-600 mb-3" aria-hidden="true" />
        <h1 className="text-xl font-bold text-primary mb-2">
          Anmeldung gerade nicht erreichbar
        </h1>
        <p className="text-sm text-text-light leading-relaxed">
          Bitte später erneut versuchen oder die Schule kontaktieren.
        </p>
      </CenteredCard>
    );
  }

  if (stage === "done") {
    return (
      <div className="min-h-screen bg-bg px-4 py-8">
        <div className="mx-auto max-w-md">
          <div className="rounded-2xl bg-white border border-border shadow-sm p-6 text-center">
            <CheckCircle2
              className="h-12 w-12 text-emerald-600 mx-auto mb-3"
              aria-hidden="true"
            />
            <h1 className="text-2xl font-bold text-primary mb-2">
              Vielen Dank!
            </h1>
            <p className="text-sm text-text leading-relaxed">
              Die Anmeldung für <strong>{childName}</strong> ist bei der
              Schule eingegangen.
            </p>
            {parentEmail && (
              <p className="text-xs text-text-light mt-3 leading-relaxed border-t border-border pt-3">
                <Mail className="inline h-3.5 w-3.5 mr-1" aria-hidden="true" />
                Sie erhalten an <strong>{parentEmail}</strong> eine
                Benachrichtigung, sobald die Klassenzuteilung feststeht.
              </p>
            )}
            <p className="text-[11px] text-text-light/80 mt-3 leading-relaxed">
              Hinweis: Bis zum Schuljahresbeginn können sich Klassen­zuteilungen
              noch ändern.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // stage === "form" or "submitting"
  if (!session) return null;
  return (
    <div className="min-h-screen bg-bg pb-32">
      <div className="mx-auto max-w-xl px-4 py-6 md:py-10 space-y-4">
        {/* Hero als Karte – kein voll-breiter Teal-Stripe mehr */}
        <div className="rounded-2xl bg-primary text-white p-6 md:p-7 shadow-lg shadow-primary/20">
          <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-accent mb-2">
            <Smartphone className="h-3 w-3" aria-hidden="true" />
            Online-Anmeldung
          </p>
          <h1 className="text-2xl md:text-3xl font-bold leading-tight tracking-tight">
            {session.name}
          </h1>
          {session.school_name && (
            <p className="text-sm text-white/85 mt-1">
              {session.school_name}
            </p>
          )}
          <p className="text-xs text-white/60 mt-3 font-mono">
            Code: {session.code}
          </p>
        </div>

      <div
        className="space-y-5"
      >
        {/* Kind */}
        <section className="rounded-2xl bg-white border border-border shadow-sm p-5 space-y-4">
          <h2 className="text-base font-bold text-primary">Über das Kind</h2>
          <Field label="Vor- und Nachname *">
            <input
              type="text"
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              placeholder="z. B. Lina Müller"
              className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none"
            />
          </Field>
          <Field label="Geschlecht">
            <div className="grid grid-cols-3 gap-1 p-1 bg-bg rounded-lg">
              {(
                [
                  { v: "m", l: "♂ Junge" },
                  { v: "w", l: "♀ Mädchen" },
                  { v: "x", l: "— ohne Angabe" },
                ] as const
              ).map((o) => (
                <button
                  type="button"
                  key={o.v}
                  onClick={() => setGender(o.v)}
                  aria-pressed={gender === o.v}
                  className={`rounded-md px-2 py-2 text-xs font-bold transition-colors ${
                    gender === o.v
                      ? "bg-white text-primary shadow-sm"
                      : "text-text-light"
                  }`}
                >
                  {o.l}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Bisheriger Kindergarten / Vorklasse (optional)">
            <input
              type="text"
              value={prevClass}
              onChange={(e) => setPrevClass(e.target.value)}
              placeholder="z. B. KiTa Sonnenschein"
              className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none"
            />
          </Field>
          <Field label="Hinweis an die Schule (optional)">
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="z. B. zweisprachig, Förderbedarf"
              className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none"
            />
          </Field>
        </section>

        {/* Wünsche (Freitext) */}
        <ChipSection
          icon={<Heart className="h-5 w-5" aria-hidden="true" />}
          title="Wunschkinder"
          color="emerald"
          help={`Tippen Sie bis zu ${session.max_wishes} Namen ein, mit denen Ihr Kind gerne in einer Klasse wäre. Die Kinder müssen sich nicht selbst angemeldet haben – Vor- und Nachname genügt.`}
          list={wishes}
          input={wishInput}
          setInput={setWishInput}
          add={() =>
            addChip(wishInput, wishes, setWishes, session.max_wishes, () =>
              setWishInput("")
            )
          }
          remove={(n) => removeChip(n, wishes, setWishes)}
          max={session.max_wishes}
          placeholder="z. B. Mia Becker"
        />

        {/* NoGo */}
        <ChipSection
          icon={<Ban className="h-5 w-5" aria-hidden="true" />}
          title="Lieber nicht zusammen"
          color="red"
          help="Optional. Falls es Kinder gibt, mit denen Ihr Kind ausdrücklich nicht in einer Klasse sein sollte."
          list={noGo}
          input={noGoInput}
          setInput={setNoGoInput}
          add={() => addChip(noGoInput, noGo, setNoGo, 10, () => setNoGoInput(""))}
          remove={(n) => removeChip(n, noGo, setNoGo)}
          max={10}
          placeholder="Name des Kindes"
        />

        {/* Geschwister */}
        <ChipSection
          icon={<Users className="h-5 w-5" aria-hidden="true" />}
          title="Geschwisterkinder an dieser Schule"
          color="violet"
          help="Optional. Damit kann die Schule Geschwister-Konstellationen berücksichtigen."
          list={siblings}
          input={siblingInput}
          setInput={setSiblingInput}
          add={() =>
            addChip(siblingInput, siblings, setSiblings, 10, () =>
              setSiblingInput("")
            )
          }
          remove={(n) => removeChip(n, siblings, setSiblings)}
          max={10}
          placeholder="Vor- und Nachname"
        />

        {/* Eltern-Kontakt */}
        <section className="rounded-2xl bg-white border border-border shadow-sm p-5 space-y-3">
          <div>
            <h2 className="text-base font-bold text-primary mb-1">
              Rückmeldung per E-Mail (empfohlen)
            </h2>
            <p className="text-xs text-text-light leading-relaxed">
              Wenn Sie hier eine E-Mail-Adresse hinterlegen, informiert die
              Schule Sie automatisch, sobald die Klassenzuteilung feststeht.
            </p>
          </div>
          <Field label="Ihr Name (optional)">
            <input
              type="text"
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              placeholder="z. B. Sabine Müller"
              autoComplete="name"
              className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none"
            />
          </Field>
          <Field label="E-Mail-Adresse">
            <input
              type="email"
              value={parentEmail}
              onChange={(e) => setParentEmail(e.target.value)}
              placeholder="ihre@e-mail.de"
              autoComplete="email"
              inputMode="email"
              className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none"
            />
          </Field>
        </section>

        {/* Ansprechperson – wenn von der Schule hinterlegt */}
        {(session.contact_name || session.contact_email) && (
          <section className="rounded-2xl bg-white border border-border shadow-sm p-5">
            <h2 className="inline-flex items-center gap-2 text-base font-bold text-primary mb-1.5">
              <UserCheck className="h-5 w-5" aria-hidden="true" />
              Bei Rückfragen
            </h2>
            <p className="text-xs text-text-light mb-2 leading-relaxed">
              Wenden Sie sich an die Ansprechperson Ihrer Schule:
            </p>
            <div className="text-sm text-text leading-relaxed">
              {session.contact_name && (
                <p className="font-bold">{session.contact_name}</p>
              )}
              {session.contact_email && (
                <a
                  href={`mailto:${session.contact_email}?subject=${encodeURIComponent(
                    `Klassenanmeldung: ${session.name}`
                  )}`}
                  className="font-mono text-primary underline decoration-accent-strong/40 underline-offset-2 hover:decoration-accent-strong break-all"
                >
                  {session.contact_email}
                </a>
              )}
            </div>
          </section>
        )}

        {/* DSGVO-Zustimmung (Pflicht) */}
        <section
          className={`rounded-2xl bg-white border-2 p-5 transition-colors ${
            consent ? "border-emerald-400" : "border-accent-strong/40"
          }`}
        >
          <h2 className="text-base font-bold text-primary mb-2 inline-flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            Datenschutz-Hinweis
          </h2>
          <p className="text-xs text-text leading-relaxed mb-3">
            Die Eingaben werden ausschließlich zur Klassenbildung an{" "}
            <strong>
              {session.school_name ?? session.name ?? "die Schule"}
            </strong>{" "}
            übermittelt und nach Abschluss der Klassenbildung gelöscht.
            Rechtsgrundlage: Art. 6 Abs. 1 lit. e DSGVO i. V. m. § 31 NSchG
            sowie – bei Angabe einer E-Mail-Adresse zur Rückmeldung – Art. 6
            Abs. 1 lit. a DSGVO (Einwilligung). Vollständige Hinweise unter{" "}
            <Link
              href="/datenschutz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline decoration-accent-strong/40 underline-offset-2 hover:decoration-accent-strong"
            >
              digiki-os.de/datenschutz
            </Link>
            .
          </p>
          <label className="flex items-start gap-3 cursor-pointer rounded-lg p-2 -m-2 hover:bg-bg/40 transition-colors">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => {
                setConsent(e.target.checked);
                if (e.target.checked && errMsg) setErrMsg("");
              }}
              className="mt-0.5 h-4 w-4 accent-primary shrink-0"
              required
              aria-required="true"
            />
            <span className="text-sm text-text leading-snug">
              Ich habe die Datenschutzhinweise zur Kenntnis genommen und
              bin mit der zweckgebundenen Verarbeitung der oben gemachten
              Angaben einverstanden.
              <span className="block text-[11px] text-text-light mt-0.5">
                Pflicht für den Versand
              </span>
            </span>
          </label>
        </section>

        {errMsg && (
          <div
            role="alert"
            className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900"
          >
            <AlertTriangle className="inline h-4 w-4 mr-1.5" aria-hidden="true" />
            {errMsg}
          </div>
        )}

        {/* Legal-Footer – Pflicht für DSGVO-konforme öffentliche Formulare */}
        <footer className="pt-4 mt-2 border-t border-border text-center">
          <ul className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-text-light">
            <li>
              <Link
                href="/impressum"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary underline-offset-2 hover:underline"
              >
                Impressum
              </Link>
            </li>
            <li aria-hidden="true">·</li>
            <li>
              <Link
                href="/datenschutz"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary underline-offset-2 hover:underline"
              >
                Datenschutz
              </Link>
            </li>
            <li aria-hidden="true">·</li>
            <li>
              <Link
                href="/barrierefreiheit"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary underline-offset-2 hover:underline"
              >
                Barrierefreiheit
              </Link>
            </li>
          </ul>
          <p className="text-[10px] text-text-light/70 mt-2 leading-relaxed">
            Bereitgestellt über DigiKI – Digitalisierung &amp; KI an
            Grundschulen Osnabrück.
          </p>
        </footer>
      </div>
      </div>

      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-border shadow-lg p-3 z-50">
        <div className="mx-auto max-w-xl">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={stage === "submitting" || !childName.trim() || !consent}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-accent text-text px-4 py-4 text-base font-bold hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {stage === "submitting" ? (
              <>Wird gesendet…</>
            ) : !consent ? (
              <>
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                Datenschutz bestätigen, dann senden
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                Anmeldung senden
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full rounded-2xl bg-white border border-border p-6 shadow-sm">
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-text-light block mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}

const COLOR_MAP: Record<
  "emerald" | "red" | "violet",
  { border: string; chipBg: string; chipText: string; addBtn: string; help: string }
> = {
  emerald: {
    border: "border-emerald-300",
    chipBg: "bg-emerald-100",
    chipText: "text-emerald-900",
    addBtn: "bg-emerald-600 hover:bg-emerald-700",
    help: "text-emerald-800",
  },
  red: {
    border: "border-red-200",
    chipBg: "bg-red-100",
    chipText: "text-red-900",
    addBtn: "bg-red-600 hover:bg-red-700",
    help: "text-red-800",
  },
  violet: {
    border: "border-violet-200",
    chipBg: "bg-violet-100",
    chipText: "text-violet-900",
    addBtn: "bg-violet-600 hover:bg-violet-700",
    help: "text-violet-800",
  },
};

function ChipSection({
  icon,
  title,
  color,
  help,
  list,
  input,
  setInput,
  add,
  remove,
  max,
  placeholder,
}: {
  icon: React.ReactNode;
  title: string;
  color: "emerald" | "red" | "violet";
  help: string;
  list: string[];
  input: string;
  setInput: (v: string) => void;
  add: () => void;
  remove: (name: string) => void;
  max: number;
  placeholder: string;
}) {
  const c = COLOR_MAP[color];
  const atLimit = list.length >= max;
  return (
    <section className={`rounded-2xl bg-white border-2 ${c.border} shadow-sm p-5`}>
      <div className="flex items-center justify-between mb-2">
        <h2 className={`inline-flex items-center gap-2 text-base font-bold ${c.help}`}>
          {icon}
          {title}
        </h2>
        <span className="font-mono text-xs tabular-nums text-text-light">
          {list.length}
          {max < 99 && ` / ${max}`}
        </span>
      </div>
      <p className="text-xs text-text-light mb-3 leading-relaxed">{help}</p>

      {list.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 mb-3">
          {list.map((n) => (
            <li
              key={n}
              className={`inline-flex items-center gap-1 rounded-full ${c.chipBg} ${c.chipText} pl-3 pr-1 py-1 text-sm font-medium`}
            >
              {n}
              <button
                type="button"
                onClick={() => remove(n)}
                aria-label={`${n} entfernen`}
                className="ml-1 rounded-full hover:bg-white/50 p-0.5"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={atLimit ? "Maximum erreicht" : placeholder}
          disabled={atLimit}
          className="flex-1 rounded-lg border border-border bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none disabled:bg-bg/40 disabled:text-text-light"
        />
        <button
          type="button"
          onClick={add}
          disabled={atLimit || !input.trim()}
          className={`inline-flex items-center justify-center gap-1 rounded-lg ${c.addBtn} text-white px-3 py-2.5 text-sm font-bold disabled:opacity-40 transition-colors`}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add
        </button>
      </div>
    </section>
  );
}

function translateError(code: unknown): string {
  switch (code) {
    case "rate_limited":
      return "Zu viele Anmeldungen kurz hintereinander. Bitte einen Moment warten.";
    case "session_closed":
      return "Die Anmeldung wurde inzwischen geschlossen.";
    case "session_not_found":
      return "Anmelde-Code wurde nicht gefunden.";
    case "missing_fields":
      return "Bitte mindestens den Namen des Kindes ausfüllen.";
    case "invalid_email":
      return "Die angegebene E-Mail-Adresse scheint ungültig zu sein.";
    default:
      return "Anmeldung konnte nicht gespeichert werden. Bitte später erneut versuchen.";
  }
}
