import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import {
  getBestandsaufnahmePrefill,
  getLockedFieldsFromPrefill,
} from "@/lib/bestandsaufnahme/getPrefill";
import { getSchoolTrainings } from "@/lib/schulungen/getSchoolTrainings";
import StudentAssistantForm from "@/components/forms/StudentAssistantForm";
import BackButton from "@/components/BackButton";

export const metadata: Metadata = {
  title: "Antrag: Gezielte Unterstützung durch studentische Hilfskräfte - DigiKI",
  description:
    "Punktuelle Unterstützung durch studentische Hilfskräfte bei konkreten Hürden – nach Schulungsteilnahme und schulinterner Weitergabe. Für Grundschulen in Stadt und Landkreis Osnabrück.",
  alternates: { canonical: "/fuer-schulen/antrag-hilfskraefte" },
};

// Kein Caching – Prefill aus der BSA und die Schulungsanmeldungen der
// Schule sollen immer aktuell sein.
export const dynamic = "force-dynamic";
export const revalidate = 0;

const PAGE_PATH = "/fuer-schulen/antrag-hilfskraefte";

// Der 3-Stufen-Weg aus dem Projekt: Schulung → Kollegium → gezielte Hilfe.
const WEG_STEPS = [
  {
    step: 1,
    title: "Schulung besuchen",
    description:
      "Der erste Schritt führt über die KOS-Fortbildungen: Dort lernen Lehrkräfte Ihrer Schule den praktischen Einsatz der KI-Tools kennen. Jede Schule kann aktuell zwei Lehrkräfte und eine Person aus der Schulleitung entsenden.",
    link: {
      href: "/fuer-schulen#kos-fortbildungen",
      label: "Zu den KOS-Fortbildungsterminen",
    },
  },
  {
    step: 2,
    title: "Wissen im Kollegium weitergeben",
    description:
      "Die geschulten Lehrkräfte geben ihr Wissen als Multiplikatorinnen und Multiplikatoren im Kollegium weiter. Erfahrungsgemäß lassen sich die meisten Fragen auf diesem Weg schulintern lösen – schnell und nachhaltig.",
  },
  {
    step: 3,
    title: "Gezielte Unterstützung anfragen",
    description:
      "Bleibt danach eine konkrete Hürde bestehen, prüfen wir, ob eine punktuelle Unterstützung durch eine studentische Hilfskraft möglich ist – zum Beispiel ein Einzeltermin zur technischen Einrichtung eines Tools.",
  },
];

async function getParticipatingSchoolCount(): Promise<number | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("count_participating_schools");
    if (error || typeof data !== "number") return null;
    return data;
  } catch {
    return null;
  }
}

export default async function AntragHilfskraeftePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/best-practice/login?redirect=${encodeURIComponent(PAGE_PATH)}`);
  }

  const prefill = await getBestandsaufnahmePrefill();
  const lockedFromBSA = getLockedFieldsFromPrefill(prefill);

  // Schulname für den Schulungs-Abgleich: serverseitig aus BSA bzw. Profil –
  // nie aus Client-Input.
  let schoolName: string | null = prefill?.school_name ?? null;
  if (!schoolName) {
    const profile = await getCurrentProfile();
    schoolName = profile?.school?.trim() ? profile.school : null;
  }

  const [registeredTrainings, liveSchoolCount] = await Promise.all([
    getSchoolTrainings(schoolName),
    getParticipatingSchoolCount(),
  ]);

  return (
    <>
      {/* Hero */}
      <section className="bg-primary py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <BackButton
            fallbackHref="/best-practice/datenbank"
            fallbackLabel="Zurück zu meinen Einreichungen"
            className="inline-flex items-center gap-1 text-sm text-white/70 hover:text-white transition-colors mb-4"
          />
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            Gezielte Unterstützung durch studentische Hilfskräfte
          </h1>
          <p className="text-lg text-white/70 mt-2 max-w-[70ch]">
            Wenn nach Schulung und schulinterner Weitergabe eine konkrete Hürde
            bleibt, prüfen wir, ob eine punktuelle Unterstützung an Ihrer Schule
            möglich ist.
          </p>
        </div>
      </section>

      {/* Der DigiKI-Weg + Erwartung + Formular */}
      <section className="bg-bg py-12 md:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-10">
          {/* Der DigiKI-Weg */}
          <div aria-labelledby="digiki-weg-heading">
            <h2
              id="digiki-weg-heading"
              className="text-2xl md:text-3xl font-bold text-primary"
            >
              So kommt Unterstützung an Ihre Schule
            </h2>
            <p className="mt-2 mb-6 max-w-[70ch] text-text-light">
              Damit alle Grundschulen von den Angeboten profitieren, gehen wir
              gemeinsam drei Schritte:
            </p>
            <div className="grid grid-cols-1 gap-4">
              {WEG_STEPS.map((item) => (
                <div
                  key={item.step}
                  className="flex items-start gap-4 bg-white rounded-xl p-5 shadow-sm border border-border"
                >
                  <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-text font-bold shrink-0">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="font-semibold text-primary mb-1">
                      {item.title}
                    </h3>
                    <p className="text-sm text-text-light">
                      {item.description}
                    </p>
                    {item.link && (
                      <Link
                        href={item.link.href}
                        className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                      >
                        {item.link.label}
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Erwartungs-Hinweis */}
          <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-white p-6 shadow-sm md:p-8">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-primary-light/15 blur-3xl"
            />
            <div className="relative flex items-start gap-5">
              <span
                aria-hidden="true"
                className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
              >
                <Sparkles className="h-6 w-6" />
              </span>
              <div className="flex-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-accent-strong">
                  Gezielt und fair verteilt
                </p>
                <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-text-light">
                  {liveSchoolCount && liveSchoolCount > 0
                    ? `Aktuell nehmen ${liveSchoolCount} Grundschulen aus Stadt und Landkreis Osnabrück am Projekt DigiKI teil.`
                    : "Am Projekt DigiKI nehmen zahlreiche Grundschulen aus Stadt und Landkreis Osnabrück teil."}{" "}
                  Damit alle Schulen profitieren, setzen wir studentische
                  Hilfskräfte gezielt und punktuell ein – für konkrete Hürden,
                  nicht als laufende Begleitung im Unterricht oder über mehrere
                  Monate. Die besten Chancen hat Ihr Antrag, wenn das Anliegen
                  klar umrissen ist und sich in ein bis drei Terminen lösen
                  lässt. Wir prüfen jede Anfrage einzeln und melden uns zeitnah
                  zurück.
                </p>
              </div>
            </div>
          </div>

          {/* Formular */}
          <StudentAssistantForm
            lockedEmail={user.email ?? ""}
            prefillFromBSA={prefill}
            lockedFromBSA={lockedFromBSA}
            registeredTrainings={registeredTrainings}
          />
        </div>
      </section>
    </>
  );
}
