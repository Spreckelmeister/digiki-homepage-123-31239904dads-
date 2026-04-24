import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock, AlertTriangle, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Konto gelöscht",
  description: "Bestätigung zur Löschung Ihres DigiKI-Kontos.",
  robots: { index: false, follow: false },
};

type Status = "ok" | "expired" | "invalid" | "error" | "unknown";

function parseStatus(raw: string | string[] | undefined): Status {
  if (typeof raw !== "string") return "unknown";
  if (raw === "ok" || raw === "expired" || raw === "invalid" || raw === "error") return raw;
  return "unknown";
}

interface CopyBlock {
  eyebrow: string;
  eyebrowColor: string;
  title: string;
  body: string;
  icon: React.ReactNode;
  accentBar: string;
  tone: "success" | "warning" | "error";
}

function getCopy(status: Status): CopyBlock {
  if (status === "ok") {
    return {
      eyebrow: "Vorgang abgeschlossen",
      eyebrowColor: "text-slate-600",
      title: "Ihr DigiKI-Konto wurde gelöscht",
      body:
        "Die Löschung wurde erfolgreich durchgeführt. Eine Bestätigung mit dem Nachweis der entfernten Daten wurde zusätzlich an die hinterlegte E-Mail-Adresse versendet.",
      icon: <CheckCircle2 className="h-7 w-7" aria-hidden="true" strokeWidth={1.75} />,
      accentBar: "from-slate-500 to-slate-700",
      tone: "success",
    };
  }
  if (status === "expired") {
    return {
      eyebrow: "Link abgelaufen",
      eyebrowColor: "text-amber-700",
      title: "Der Bestätigungs-Link ist nicht mehr gültig",
      body:
        "Aus Sicherheitsgründen sind Löschungs-Links 24 Stunden lang gültig. Ihr Konto ist unverändert aktiv. Wenn Sie weiterhin löschen möchten, starten Sie den Vorgang bitte erneut in Ihren Konto-Einstellungen.",
      icon: <Clock className="h-7 w-7" aria-hidden="true" strokeWidth={1.75} />,
      accentBar: "from-amber-600 to-amber-800",
      tone: "warning",
    };
  }
  if (status === "invalid") {
    return {
      eyebrow: "Link nicht erkannt",
      eyebrowColor: "text-red-700",
      title: "Dieser Bestätigungs-Link ist ungültig",
      body:
        "Der Link konnte nicht verifiziert werden. Möglicherweise wurde er verändert oder stammt nicht aus einer offiziellen DigiKI-E-Mail. Ihr Konto ist unverändert aktiv.",
      icon: <AlertTriangle className="h-7 w-7" aria-hidden="true" strokeWidth={1.75} />,
      accentBar: "from-red-700 to-red-900",
      tone: "error",
    };
  }
  if (status === "error") {
    return {
      eyebrow: "Technischer Fehler",
      eyebrowColor: "text-red-700",
      title: "Der Löschvorgang konnte nicht abgeschlossen werden",
      body:
        "Beim Verarbeiten der Löschung ist ein Fehler aufgetreten. Ihr Konto ist möglicherweise unverändert. Bitte melden Sie sich bei Kai Krafft, damit der Vorgang manuell geprüft werden kann.",
      icon: <AlertTriangle className="h-7 w-7" aria-hidden="true" strokeWidth={1.75} />,
      accentBar: "from-red-700 to-red-900",
      tone: "error",
    };
  }
  return {
    eyebrow: "Status",
    eyebrowColor: "text-slate-600",
    title: "Konto-Löschung",
    body:
      "Diese Seite zeigt den Status eines Lösch-Vorgangs. Sie sollten über Ihre Bestätigungs-E-Mail hierher gelangen.",
    icon: <CheckCircle2 className="h-7 w-7" aria-hidden="true" strokeWidth={1.75} />,
    accentBar: "from-slate-500 to-slate-700",
    tone: "success",
  };
}

export default async function KontoGeloeschtPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  const params = await searchParams;
  const status = parseStatus(params.status);
  const copy = getCopy(status);

  const now = new Date();
  const formattedDate = new Intl.DateTimeFormat("de-DE", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Berlin",
  }).format(now);

  const iconTint =
    copy.tone === "success"
      ? "bg-slate-100 text-slate-700 ring-slate-200"
      : copy.tone === "warning"
        ? "bg-amber-50 text-amber-800 ring-amber-200"
        : "bg-red-50 text-red-800 ring-red-200";

  return (
    <main className="relative min-h-[calc(100vh-5rem)] bg-bg overflow-hidden">
      {/* Dezentes Papier-Raster im Hintergrund – verweist auf „Bescheinigung" */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, #0f172a 0 1px, transparent 1px 24px), repeating-linear-gradient(0deg, #0f172a 0 1px, transparent 1px 24px)",
        }}
      />
      {/* Akzent-Eckblobs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -right-32 h-80 w-80 rounded-full bg-slate-400/10 blur-3xl"
      />

      <div className="relative mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        {/* Eyebrow-Zeile */}
        <div className="flex items-center gap-3 mb-6 text-xs font-semibold uppercase tracking-[0.18em]">
          <span aria-hidden="true" className="h-px w-8 bg-slate-400" />
          <span className={copy.eyebrowColor}>{copy.eyebrow}</span>
        </div>

        {/* Dokument-Card */}
        <article className="relative bg-white rounded-xl shadow-[0_1px_3px_rgba(15,23,42,0.05),0_20px_40px_-20px_rgba(15,23,42,0.15)] border border-slate-200 overflow-hidden">
          {/* Akzent-Streifen oben */}
          <div
            aria-hidden="true"
            className={`h-1 bg-gradient-to-r ${copy.accentBar}`}
          />

          <div className="p-8 md:p-12">
            <div className="flex items-start gap-5 mb-8">
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ring-1 ${iconTint}`}
              >
                {copy.icon}
              </div>
              <div className="pt-1">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight tracking-tight">
                  {copy.title}
                </h1>
              </div>
            </div>

            <p className="text-base md:text-lg text-slate-700 leading-relaxed mb-8">
              {copy.body}
            </p>

            {/* Metadaten-Leiste im „Amtsdokument"-Stil */}
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-y border-slate-200">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500 mb-1.5">
                  Aufruf
                </dt>
                <dd className="text-sm text-slate-900 font-medium">
                  {formattedDate}
                </dd>
                <dd className="text-xs text-slate-500 mt-0.5">
                  Zeitzone Europe/Berlin
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500 mb-1.5">
                  Status
                </dt>
                <dd className="text-sm text-slate-900 font-mono">
                  {status.toUpperCase()}
                </dd>
                <dd className="text-xs text-slate-500 mt-0.5">
                  DigiKI · Vorgang Account-Löschung
                </dd>
              </div>
            </dl>

            {/* Handlungshinweis nur bei Fehler/Expired */}
            {copy.tone !== "success" && (
              <div
                className={`mt-8 rounded-lg border p-4 text-sm leading-relaxed ${
                  copy.tone === "warning"
                    ? "border-amber-200 bg-amber-50 text-amber-900"
                    : "border-red-200 bg-red-50 text-red-900"
                }`}
              >
                <p className="font-semibold mb-1">Nächster Schritt</p>
                <p>
                  {copy.tone === "warning"
                    ? "Melden Sie sich in Ihrem Konto an und starten Sie den Löschvorgang neu, um einen frischen Bestätigungs-Link zu erhalten."
                    : "Senden Sie eine kurze Nachricht an Kai Krafft (krafft@osnabrueck.de), damit der Vorgang manuell bearbeitet werden kann."}
                </p>
              </div>
            )}

            <div className="mt-10 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Zurück zur Startseite
              </Link>
              {copy.tone === "success" ? (
                <p className="text-xs text-slate-500">
                  Eine Kopie dieser Bestätigung erhalten Sie per E-Mail.
                </p>
              ) : (
                <Link
                  href="/best-practice/login"
                  className="text-sm text-slate-600 hover:text-primary underline underline-offset-4 transition-colors"
                >
                  Zur Anmeldung
                </Link>
              )}
            </div>
          </div>
        </article>

        {/* Dezenter Footer-Stamp – erinnert an amtliche Dokumente */}
        <p className="mt-6 text-center text-[11px] font-mono uppercase tracking-[0.2em] text-slate-400">
          DigiKI · Osnabrück · Automatisch erzeugt
        </p>
      </div>
    </main>
  );
}
