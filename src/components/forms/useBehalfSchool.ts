"use client";

import { useEffect, useState } from "react";
import type { BestandsaufnahmePrefill } from "@/lib/bestandsaufnahme/getPrefill";
import type { RegisteredTraining } from "@/lib/schulungen/getSchoolTrainings";

/**
 * Stellvertreter-Modus der Antragsformulare (Admin/Schulungsteam füllt für
 * eine Schule aus): Schulauswahl aus der verifizierten Liste, Schulungs-
 * prüfung + Vorbefüllung der gewählten Schule, Überspringen-Haken.
 *
 * Der Hook hält die gesamte Logik; die Formulare besitzen weiterhin ihren
 * eigenen `schoolInfo`-State und bekommen Wertänderungen über `onValues`
 * hereingereicht (ein Patch pro Auswahl/Zurücksetzen/Aktualisieren).
 */

export interface BehalfSchool {
  name: string;
  street: string | null;
  city: string | null;
  plz: string | null;
}

export type BehalfSoftSource = "bsa" | "antrag" | "dashboard";

export interface BehalfExtraRow {
  key: string;
  label: string;
  value: string;
  source: BehalfSoftSource;
  hidesField?: string;
}

export type SchoolInfoPatch = {
  school_name: string;
  school_street: string;
  school_plz: string;
  school_city: string;
  principal_name: string;
  contact_person: string;
  phone: string;
  email: string;
  teacher_count: string;
  student_count: string;
};

const EMPTY_PATCH: SchoolInfoPatch = {
  school_name: "",
  school_street: "",
  school_plz: "",
  school_city: "",
  principal_name: "",
  contact_person: "",
  phone: "",
  email: "",
  teacher_count: "",
  student_count: "",
};

export function useBehalfSchool(
  active: boolean,
  onValues: (patch: SchoolInfoPatch) => void,
) {
  const [schools, setSchools] = useState<BehalfSchool[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<BehalfSchool | null>(null);
  const [trainings, setTrainings] = useState<RegisteredTraining[] | null>(null);
  const [trainingsLoading, setTrainingsLoading] = useState(false);
  const [skip, setSkip] = useState(false);
  // Weich bekannte Felder der gewählten Schule (BSA + letzter Antrag +
  // Schulungsdashboard) – erscheinen in der Zusammenfassungs-Karte statt
  // als Eingabefelder.
  const [soft, setSoft] = useState<
    Array<{ field: string; source: BehalfSoftSource }>
  >([]);
  // Reine Anzeige-Zeilen (z. B. Schülerzahl-Band aus der BSA).
  const [extras, setExtras] = useState<BehalfExtraRow[]>([]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    (async () => {
      setSchoolsLoading(true);
      try {
        const res = await fetch("/api/schulungen/school-picker");
        const json = await res.json().catch(() => ({}));
        if (!cancelled) {
          setSchools(Array.isArray(json.schools) ? json.schools : []);
        }
      } catch {
        if (!cancelled) setSchools([]);
      } finally {
        if (!cancelled) setSchoolsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active]);

  /** Schule wählen bzw. (bei erneutem Aufruf mit derselben Schule) die
   *  übernommenen Werte frisch aus der Bestandsaufnahme laden. */
  async function choose(school: BehalfSchool) {
    setSelected(school);
    setSearch("");
    setSkip(false);
    setSoft([]);
    setExtras([]);
    // Alle Angaben zurücksetzen: Sie gehören ggf. zur vorher gewählten Schule.
    onValues({ ...EMPTY_PATCH, school_name: school.name });
    setTrainings(null);
    setTrainingsLoading(true);
    try {
      const res = await fetch(
        `/api/schulungen/school-picker?school=${encodeURIComponent(school.name)}`,
      );
      const json = await res.json().catch(() => ({}));
      setTrainings(Array.isArray(json.trainings) ? json.trainings : []);

      // Bestandsaufnahme + letzter Antrag + Schulungsdashboard der Schule:
      // vorhandene Werte übernehmen und als „weich bekannt" in die Karte
      // legen – der Stellvertreter tippt nur noch, was wirklich fehlt.
      const prefill =
        json && typeof json.prefill === "object" && json.prefill !== null
          ? (json.prefill as BestandsaufnahmePrefill)
          : null;

      // Adresse: bevorzugt aus dem letzten Antrag der Schule, sonst aus dem
      // Schulungsdashboard (schools-Tabelle liefert Straße/PLZ/Ort mit).
      const street = prefill?.school_street ?? school.street ?? "";
      const plz = prefill?.school_plz ?? school.plz ?? "";
      const city = prefill?.school_city ?? school.city ?? "";
      const addressSource: BehalfSoftSource = prefill?.school_street
        ? "antrag"
        : "dashboard";

      onValues({
        school_name: school.name,
        school_street: street,
        school_plz: plz,
        school_city: city,
        principal_name: prefill?.principal_name ?? "",
        contact_person: prefill?.contact_person ?? "",
        phone: prefill?.phone ?? "",
        email: prefill?.email ?? "",
        teacher_count: prefill?.teacher_count ?? "",
        student_count: prefill?.student_count ?? "",
      });

      const nextSoft: Array<{ field: string; source: BehalfSoftSource }> = [];
      if (street && plz && city) {
        nextSoft.push(
          { field: "school_street", source: addressSource },
          { field: "school_plz", source: addressSource },
          { field: "school_city", source: addressSource },
        );
      }
      for (const field of [
        "principal_name",
        "contact_person",
        "phone",
        "email",
        "teacher_count",
      ] as const) {
        if (prefill?.[field]) nextSoft.push({ field, source: "bsa" });
      }
      if (prefill?.student_count) {
        nextSoft.push({ field: "student_count", source: "antrag" });
      }
      setSoft(nextSoft);

      // Keine exakte Schülerzahl? Dann das Band aus der BSA anzeigen –
      // es passt nicht in das Zahlenfeld, ist aber die gewünschte Info.
      setExtras(
        !prefill?.student_count && prefill?.student_count_band
          ? [
              {
                key: "student_count_band",
                label: "Anzahl Schüler/innen",
                value: prefill.student_count_band,
                source: "bsa",
                hidesField: "student_count",
              },
            ]
          : [],
      );
    } catch {
      setTrainings([]);
    } finally {
      setTrainingsLoading(false);
    }
  }

  function reset() {
    setSelected(null);
    setTrainings(null);
    setSkip(false);
    setSoft([]);
    setExtras([]);
    onValues(EMPTY_PATCH);
  }

  const query = search.trim().toLowerCase();
  const matches = query
    ? schools.filter((s) => s.name.toLowerCase().includes(query))
    : schools;
  const shown = matches.slice(0, 12);

  // Im Stellvertreter-Modus steht der Schulungsstatus erst fest, wenn eine
  // Schule gewählt UND die Prüfung geladen ist – vorher keine Boxen zeigen.
  const statusKnown =
    selected !== null && !trainingsLoading && trainings !== null;

  return {
    schools,
    schoolsLoading,
    search,
    setSearch,
    matches,
    shown,
    selected,
    trainings,
    trainingsLoading,
    statusKnown,
    skip,
    setSkip,
    soft,
    extras,
    choose,
    reset,
  };
}
