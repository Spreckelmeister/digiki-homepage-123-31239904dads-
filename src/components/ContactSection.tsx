import Link from "next/link";
import { ArrowRight, MapPin, Users } from "lucide-react";
import { projectData } from "@/data/project";
import ContactForm from "@/components/ContactForm";

export default function ContactSection() {
  return (
    <section
      id="kontakt"
      className="py-16 md:py-24 bg-primary border-t border-white/10"
      aria-labelledby="contact-section-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Linke Seite: Text + Team-Infos */}
          <div>
            <h2
              id="contact-section-heading"
              className="text-2xl md:text-3xl font-bold text-white mb-4"
            >
              Interesse? Sprechen Sie uns an!
            </h2>
            <p className="text-lg text-white/80 mb-8">
              Wir beraten Sie gerne persönlich zu den Teilnahmemöglichkeiten
              und finden gemeinsam das passende Format für Ihre Schule.
              Schreiben Sie uns einfach über das Kontaktformular – Ihre
              Nachricht landet direkt beim DigiKI-Team und wir melden uns so
              schnell wie möglich zurück.
            </p>

            <div className="space-y-4">
              <div className="flex items-start gap-3 text-white/90">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Users className="w-4 h-4" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm text-white/90">Ihr Kontakt</p>
                  <p className="font-semibold text-white">DigiKI-Team</p>
                  <p className="text-sm text-white/80">
                    Stadt Osnabrück · Fachbereich Bildung
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-white/90">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm text-white/90">Adresse</p>
                  <p>{projectData.projectLeadAddress}</p>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <Link
                href={projectData.surveyUrl}
                className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-white/30 bg-white/10 px-6 py-3 text-lg font-semibold text-white hover:bg-white/20 transition-colors"
              >
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
                Zur Bestandsaufnahme
              </Link>
            </div>

            <p className="mt-6 text-sm text-white/60">
              Die offiziellen Kontaktangaben des Projekts finden Sie im{" "}
              <Link
                href="/impressum"
                className="underline underline-offset-2 hover:text-white"
              >
                Impressum
              </Link>
              .
            </p>
          </div>

          {/* Rechte Seite: Kontaktformular */}
          <div id="ansprechpartner">
            <ContactForm />
          </div>
        </div>
      </div>
    </section>
  );
}
