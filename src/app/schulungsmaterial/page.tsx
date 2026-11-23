import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileText, Film, Headphones, Image as ImageIcon, MonitorPlay } from "lucide-react";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import AuthStatus from "@/components/best-practice/AuthStatus";
import { hasBestandsaufnahme } from "@/lib/material/server";
import { KIND_LABEL, type MaterialItem, type MaterialKind } from "@/lib/material/shared";

export const metadata: Metadata = {
  title: "Schulungsmaterial - DigiKI",
  description:
    "Schulungsmaterial zu digitalen Werkzeugen und KI für Grundschulen – für angemeldete Schulen.",
  alternates: { canonical: "/schulungsmaterial" },
};

export const dynamic = "force-dynamic";

const KIND_ICON: Record<MaterialKind, typeof Film> = {
  video: Film,
  audio: Headphones,
  pdf: FileText,
  image: ImageIcon,
  html: MonitorPlay,
};

export default async function SchulungsmaterialPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = user ? await getCurrentProfile() : null;

  let items: MaterialItem[] = [];
  let unavailable = false;
  // Schulkonto ohne Bestandsaufnahme → Hinweis aufs Förderprogramm.
  const materialOnly =
    profile?.role?.toLowerCase() === "teacher" &&
    !(await hasBestandsaufnahme(supabase));
  if (user) {
    const { data, error } = await supabase
      .from("schulungsmaterial")
      .select("*")
      .eq("published", true)
      .order("sort_order")
      .order("created_at");
    unavailable = Boolean(error);
    items = (data ?? []) as MaterialItem[];
  }

  return (
    <>
      <section className="bg-primary py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                Schulungsmaterial
              </h1>
              <p className="text-lg text-white/70">
                Videos und Unterlagen zu digitalen Werkzeugen und KI – zum
                Ansehen für Ihr Kollegium.
              </p>
            </div>
            {user && <AuthStatus initialProfile={profile} />}
          </div>
        </div>
      </section>

      <section className="bg-bg py-12 md:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {!user ? (
            <div className="rounded-xl border border-border bg-white p-8 shadow-sm">
              <h2 className="text-xl font-bold text-text mb-2">
                Für angemeldete Schulen
              </h2>
              <p className="text-text-light leading-relaxed mb-6">
                Das Schulungsmaterial steht allen Schulen mit DigiKI-Konto
                offen. Schulen im Förderprogramm melden sich mit ihrem
                bestehenden Konto an. Alle anderen Schulen können einen Zugang
                nur für das Schulungsmaterial anlegen – ohne Bestandsaufnahme.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/best-practice/login?redirect=/schulungsmaterial"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
                >
                  Anmelden
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/schulungsmaterial/registrieren"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary px-5 py-3 text-sm font-semibold text-primary hover:bg-primary/5 transition-colors"
                >
                  Zugang für Ihre Schule anlegen
                </Link>
              </div>
            </div>
          ) : unavailable ? (
            <p className="rounded-xl border border-border bg-white p-8 text-text-light shadow-sm">
              Das Schulungsmaterial ist noch nicht eingerichtet.
            </p>
          ) : items.length === 0 ? (
            <p className="rounded-xl border border-border bg-white p-8 text-text-light shadow-sm">
              Im Moment ist noch kein Material freigeschaltet. Bitte schauen
              Sie in Kürze wieder vorbei.
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {items.map((item) => {
                const Icon = KIND_ICON[item.kind];
                return (
                  <li key={item.id}>
                    <Link
                      href={`/schulungsmaterial/${item.id}`}
                      className="flex h-full items-start gap-4 rounded-xl border border-border bg-white p-5 shadow-sm transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-primary"
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs font-medium uppercase tracking-wide text-text-light">
                          {KIND_LABEL[item.kind]}
                        </span>
                        <span className="block font-semibold text-text">
                          {item.title}
                        </span>
                        {item.description && (
                          <span className="mt-1 block text-sm text-text-light line-clamp-3">
                            {item.description}
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          {materialOnly && (
            <div className="mt-10 rounded-xl border border-accent/20 bg-accent/5 p-6">
              <h2 className="font-semibold text-text mb-1">
                Am Förderprogramm teilnehmen?
              </h2>
              <p className="text-sm text-text-light leading-relaxed mb-3">
                Ihr Konto gilt bisher nur für das Schulungsmaterial. Mit der
                Bestandsaufnahme kann Ihre Schule zusätzlich Tool-Lizenzen und
                studentische Hilfskräfte beantragen und die
                Best-Practice-Datenbank nutzen.
              </p>
              <Link
                href="/bestandsaufnahme"
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary underline hover:text-primary/80"
              >
                Bestandsaufnahme ausfüllen
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
