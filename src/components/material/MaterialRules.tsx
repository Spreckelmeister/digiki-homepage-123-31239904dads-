import Link from "next/link";
import { Camera, Copy, FileClock, Fingerprint, Users } from "lucide-react";

/**
 * Die Regeln für das Schulungsmaterial in Kurzform – auf der Übersicht und
 * vor dem Öffnen jeder Unterlage. Ausführlich: /schulungsmaterial/nutzungsbedingungen.
 */
export default function MaterialRules({ headingLevel = "h2" }: { headingLevel?: "h2" | "h3" }) {
  const Heading = headingLevel;
  const rules = [
    {
      icon: Users,
      text: "Die Unterlagen sind ausschließlich zur Ansicht für das Kollegium Ihrer Schule bestimmt.",
    },
    {
      icon: Copy,
      text: "Kopieren, Speichern, Herunterladen und jede Weitergabe – auch von Zugangsdaten oder Links – sind untersagt.",
    },
    {
      icon: Camera,
      text: "Abfotografieren, Bildschirmfotos und Bildschirmaufnahmen sind untersagt.",
    },
    {
      icon: FileClock,
      text: "Jeder Zugriff wird protokolliert: Konto, Unterlage und Zeitpunkt.",
    },
    {
      icon: Fingerprint,
      text: "Die Unterlagen sind sichtbar und unsichtbar mit Ihrem Konto gekennzeichnet. Kopien lassen sich zurückverfolgen.",
    },
  ];

  return (
    <div className="rounded-xl border-2 border-primary bg-white p-6 shadow-sm">
      <Heading className="text-lg font-bold text-primary">
        Wichtig: Nur zur Ansicht – Kopieren und Fotografieren untersagt
      </Heading>
      <ul className="mt-4 space-y-3">
        {rules.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-start gap-3 text-text">
            <Icon className="mt-0.5 h-5 w-5 flex-none text-primary" aria-hidden="true" />
            <span className="leading-relaxed">{text}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-text-light">
        Es gelten die{" "}
        <Link
          href="/schulungsmaterial/nutzungsbedingungen"
          className="font-medium text-primary underline underline-offset-2 hover:text-primary/80"
        >
          Nutzungsbedingungen für das Schulungsmaterial
        </Link>
        .
      </p>
    </div>
  );
}
