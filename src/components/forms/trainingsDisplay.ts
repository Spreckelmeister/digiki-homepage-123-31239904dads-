import type { RegisteredTraining } from "@/lib/schulungen/getSchoolTrainings";

/** Anzeige-Helfer für erkannte Schulungsanmeldungen – von beiden
 *  Antragsformularen (Hilfskräfte + Tool-Lizenzen) genutzt. */

export function formatTrainingDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** „2 Lehrkräfte, 1 Schulleitung" – leer, wenn keine Zählung vorliegt. */
export function roleCounts(t: RegisteredTraining): string {
  const parts: string[] = [];
  if (t.teacherCount > 0) {
    parts.push(
      t.teacherCount === 1 ? "1 Lehrkraft" : `${t.teacherCount} Lehrkräfte`,
    );
  }
  if (t.leadershipCount > 0) {
    parts.push(
      t.leadershipCount === 1
        ? "1 Schulleitung"
        : `${t.leadershipCount} Schulleitungen`,
    );
  }
  return parts.join(", ");
}

/** Text-Schnappschuss der angezeigten Anmeldungen für die DB/Admin-Ansicht. */
export function trainingsSnapshot(trainings: RegisteredTraining[]): string {
  return trainings
    .map((t) => {
      const date = t.start_date
        ? formatTrainingDate(t.start_date)
        : "Termin folgt";
      const counts = roleCounts(t);
      return `${t.title} (${date})${counts ? ` – ${counts}` : ""}`;
    })
    .join("; ");
}
