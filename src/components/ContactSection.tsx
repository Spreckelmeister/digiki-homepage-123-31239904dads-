import Link from "next/link";
import { Mail, MapPin, ArrowRight } from "lucide-react";
import { projectData } from "@/data/project";

export default function ContactSection() {
  return (
    <section
      id="kontakt"
      className="py-16 md:py-24 bg-primary"
      aria-labelledby="contact-section-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Linke Seite: Text + Kontaktdaten */}
          <div>
            <h2
              id="contact-section-heading"
              className="text-2xl md:text-3xl font-bold text-white mb-4"
            >
              Interesse? Sprechen Sie uns an!
            </h2>
            <p className="text-lg text-white/70 mb-8">
              Wir beraten Sie gerne persönlich zu den Teilnahmemöglichkeiten und
              finden gemeinsam das passende Format für Ihre Schule.
            </p>

            <div className="space-y-4">
              <div className="flex items-start gap-3 text-white/90">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Mail className="w-4 h-4" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm text-white/60">E-Mail</p>
                  <a
                    href={`mailto:${projectData.contactEmail}`}
                    className="hover:text-white transition-colors"
                  >
                    {projectData.contactEmail}
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-3 text-white/90">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm text-white/60">Adresse</p>
                  <p>{projectData.projectLeadAddress}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Rechte Seite: Ansprechpartner + CTA-Karte */}
          <div className="bg-white/10 rounded-xl p-8">
            <h3 className="text-lg font-semibold text-white mb-1">
              Ihr Ansprechpartner
            </h3>
            <p className="text-white/70 mb-6">{projectData.projectLeadRole}</p>

            <p className="text-2xl font-bold text-white mb-6">
              {projectData.projectLead}
            </p>

            <div className="space-y-3">
              <a
                href={`mailto:${projectData.contactEmail}?subject=Interesse an DigiKI-Teilnahme`}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 font-semibold text-white hover:bg-accent-hover transition-colors"
              >
                <Mail className="w-4 h-4" aria-hidden="true" />
                E-Mail schreiben
              </a>
              <Link
                href={projectData.surveyUrl}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg border-2 border-white/30 bg-white/10 px-6 py-3 font-semibold text-white hover:bg-white/20 transition-colors"
              >
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
                Zur Bestandsaufnahme
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
