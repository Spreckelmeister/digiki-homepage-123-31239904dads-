/**
 * Lädt die jüngste Bestandsaufnahme des angemeldeten Nutzers und
 * extrahiert daraus die Felder, die in den Antrags-Formularen
 * vor-ausgefüllt + gesperrt werden können.
 *
 * Strategie: nutzt GENAU dieselbe RPC `get_my_bestandsaufnahme` wie
 * die BSA-Bearbeiten-Seite (`/best-practice/meine-bestandsaufnahme/bearbeiten`).
 * Damit ist garantiert, dass wir dieselben Werte sehen, die der User
 * dort beim Editieren sieht.
 *
 * Falls die RPC nichts liefert (z.B. weil sie aus irgendeinem Grund
 * fehlschlägt oder die BSA nicht gefunden wird), greift ein Fallback
 * via Admin-Service-Role auf die Tabelle direkt zu.
 */

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  buildRegisteredSchools,
  matchRegisteredSchool,
  schoolMatchKey,
} from "@/lib/schulungen/parse";

export interface BestandsaufnahmePrefill {
  school_name?: string;
  principal_name?: string;
  contact_person?: string;
  phone?: string;
  teacher_count?: string;
  /** Kontakt-E-Mail aus der Bestandsaufnahme – nur im Stellvertreter-Modus
   *  relevant (Schul-Konten haben ihre Konto-E-Mail fest gesetzt). */
  email?: string;
  /** Aus dem jüngsten früheren Antrag der Schule übernommen – die
   *  Bestandsaufnahme kennt keine Adresse und keine exakte Schülerzahl.
   *  Diese Felder werden NICHT gesperrt, nur vor-ausgefüllt: Es gibt
   *  keinen „Bearbeiten-Ort" wie die BSA, an dem man sie pflegen könnte. */
  school_street?: string;
  school_plz?: string;
  school_city?: string;
  student_count?: string;
  /** Schülerzahl-BAND aus der Bestandsaufnahme („unter 150", „150–300", …)
   *  – die BSA erhebt keine exakte Zahl. Nur zur Anzeige in der
   *  Zusammenfassung; wird nie in das Zahlenfeld/DB-Feld geschrieben. */
  student_count_band?: string;
}

type RawBSA = {
  school_name?: string | null;
  principal_name?: string | null;
  contact_person?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  teacher_count?: number | null;
  /** Band-Auswahl, kein Zahlwert. */
  student_count?: string | null;
  /** Nur „Stadt Osnabrück" / „Landkreis Osnabrück" – keine Adresse. */
  school_location?: string | null;
};

export async function getBestandsaufnahmePrefill(): Promise<BestandsaufnahmePrefill | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1) Primärer Weg: dieselbe RPC, die auch die BSA-Bearbeiten-Seite
  //    nutzt. Damit ist garantiert, dass wir dieselben Werte sehen.
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "get_my_bestandsaufnahme",
  );

  if (rpcError) {
    console.error(
      "[getBestandsaufnahmePrefill] rpc error:",
      rpcError.message,
    );
  }

  let raw: RawBSA | null = (rpcData as RawBSA | null) ?? null;

  // 2) Fallback: falls die RPC nichts geliefert hat, direkt mit Service-
  //    Role anfragen (umgeht RLS). User-ID + Email-Match wie in der RPC.
  if (!raw) {
    if (
      user &&
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      const admin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } },
      );

      // Erst via user_id, dann via contact_email als Fallback
      const byUserId = await admin
        .from("bestandsaufnahme_responses")
        .select(
          "school_name, principal_name, contact_person, contact_email, contact_phone, teacher_count, student_count, school_location",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      raw = byUserId.data as RawBSA | null;

      if (!raw && user.email) {
        const byEmail = await admin
          .from("bestandsaufnahme_responses")
          .select(
            "school_name, principal_name, contact_person, contact_email, contact_phone, teacher_count, student_count, school_location",
          )
          .ilike("contact_email", user.email)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        raw = byEmail.data as RawBSA | null;
      }
    }
  }

  // 3) Adresse + Schülerzahl aus dem jüngsten früheren Antrag (beide
  //    Antragsarten): Die Bestandsaufnahme kennt diese Felder nicht – wer
  //    schon einmal beantragt hat, soll sie aber nicht erneut eintippen.
  const fromApplication = await getLatestApplicationExtras(user?.email ?? null);

  if (!raw && !fromApplication) {
    console.log(
      "[getBestandsaufnahmePrefill] Keine BSA gefunden (RPC + Fallback leer).",
    );
    return null;
  }

  if (raw) {
    // Diagnose-Log: zeigt die Rohwerte aus der DB. Bei „komische Zeichen"
    // im UI sieht man hier sofort, was tatsächlich gespeichert ist.
    console.log("[getBestandsaufnahmePrefill] rohe DB-Werte:", {
      school_name: JSON.stringify(raw.school_name),
      principal_name: JSON.stringify(raw.principal_name),
      contact_person: JSON.stringify(raw.contact_person),
      contact_phone: JSON.stringify(raw.contact_phone),
      teacher_count: raw.teacher_count,
    });
  }

  return {
    school_name: cleanStr(raw?.school_name),
    principal_name: cleanStr(raw?.principal_name),
    contact_person: cleanStr(raw?.contact_person),
    phone: cleanStr(raw?.contact_phone),
    teacher_count:
      raw?.teacher_count != null && raw.teacher_count > 0
        ? String(raw.teacher_count)
        : undefined,
    student_count_band: cleanStr(raw?.student_count),
    ...fromApplication,
  };
}

/** Strings trimmen und leere Werte konsequent zu undefined machen. */
function cleanStr(v: string | null | undefined): string | undefined {
  if (typeof v !== "string") return undefined;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

type ApplicationExtras = Pick<
  BestandsaufnahmePrefill,
  "school_street" | "school_plz" | "school_city" | "student_count"
>;

type ApplicationRow = {
  school_street: string | null;
  school_plz: string | null;
  school_city: string | null;
  student_count: number | null;
  created_at: string;
};

/**
 * Jüngster früherer Antrag des Kontos (Hilfskräfte ODER Tool-Lizenzen):
 * liefert Adresse und Schülerzahl als Vorbefüllung. Die Adresse wird nur
 * als Ganzes übernommen – eine halbe Adresse hilft niemandem.
 *
 * Der Abgleich läuft über die Konto-E-Mail: Genau die wird beim Einreichen
 * gesperrt in jeden Antrag geschrieben, ist also verlässlich.
 */
async function getLatestApplicationExtras(
  email: string | null,
): Promise<ApplicationExtras | null> {
  if (!email) return null;
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return null;
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const columns = "school_street, school_plz, school_city, student_count, created_at";
  const [students, tools] = await Promise.all([
    admin
      .from("applications_student_assistants")
      .select(columns)
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(5),
    admin
      .from("applications_tool_licenses")
      .select(columns)
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const rows = [
    ...((students.data ?? []) as ApplicationRow[]),
    ...((tools.data ?? []) as ApplicationRow[]),
  ].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  if (rows.length === 0) return null;

  const withAddress = rows.find(
    (r) =>
      cleanStr(r.school_street) && cleanStr(r.school_plz) && cleanStr(r.school_city),
  );
  const withStudents = rows.find(
    (r) => r.student_count != null && r.student_count > 0,
  );
  if (!withAddress && !withStudents) return null;

  return {
    school_street: withAddress ? cleanStr(withAddress.school_street) : undefined,
    school_plz: withAddress ? cleanStr(withAddress.school_plz) : undefined,
    school_city: withAddress ? cleanStr(withAddress.school_city) : undefined,
    student_count: withStudents ? String(withStudents.student_count) : undefined,
  };
}

/**
 * Stellvertreter-Modus: Vorbefüllung für eine ÜBER IHREN NAMEN gewählte
 * Schule – jüngste Bestandsaufnahme plus Adresse/Schülerzahl aus deren
 * jüngstem früheren Antrag. Der Namens-Abgleich nutzt dieselbe Vorrangfolge
 * wie die Schulungsprüfung: zuerst die von Menschen geprüfte Zuordnungsliste
 * (`school_aliases`), dann das tolerante Auto-Matching.
 *
 * Nur serverseitig aufrufen (Service-Role) und nur hinter einer
 * Admin/Schulungsteam-Prüfung – die Daten gehören der jeweiligen Schule.
 */
export async function getPrefillForSchool(
  schoolName: string,
): Promise<BestandsaufnahmePrefill | null> {
  const pickedName = schoolName.trim();
  if (!pickedName) return null;
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return null;
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const [bsaRes, aliasRes] = await Promise.all([
    admin
      .from("bestandsaufnahme_responses")
      .select(
        "school_name, principal_name, contact_person, contact_email, contact_phone, teacher_count, student_count, school_location, created_at",
      )
      .order("created_at", { ascending: false }),
    admin.from("school_aliases").select("alias_key, canonical_name"),
  ]);

  type BsaRow = RawBSA & { created_at: string };
  const bsaRows = (bsaRes.data ?? []) as BsaRow[];
  const aliasByKey = new Map(
    (
      (aliasRes.data ?? []) as Array<{
        alias_key: string;
        canonical_name: string;
      }>
    ).map((a) => [a.alias_key, a.canonical_name]),
  );
  const registeredSchools = buildRegisteredSchools(
    bsaRows.map((r) => r.school_name ?? null),
  );

  const resolveCanonical = (name: string | null | undefined): string | null => {
    const trimmed = name?.trim();
    if (!trimmed) return null;
    const key = schoolMatchKey(trimmed);
    return (
      (key ? aliasByKey.get(key) : undefined) ??
      matchRegisteredSchool(trimmed, registeredSchools) ??
      trimmed
    );
  };

  const canonical = resolveCanonical(pickedName);
  const matchesPicked = (name: string | null | undefined): boolean => {
    if (!name?.trim()) return false;
    if (name === pickedName) return true;
    const resolved = resolveCanonical(name);
    return resolved !== null && resolved === canonical;
  };

  // Jüngste Bestandsaufnahme dieser Schule (Liste ist bereits absteigend).
  const bsa = bsaRows.find((r) => matchesPicked(r.school_name)) ?? null;

  // Adresse/Schülerzahl aus dem jüngsten früheren Antrag DIESER Schule.
  const columns =
    "school_name, school_street, school_plz, school_city, student_count, created_at";
  const [students, tools] = await Promise.all([
    admin
      .from("applications_student_assistants")
      .select(columns)
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("applications_tool_licenses")
      .select(columns)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  type AppRow = ApplicationRow & { school_name: string | null };
  const appRows = [
    ...((students.data ?? []) as AppRow[]),
    ...((tools.data ?? []) as AppRow[]),
  ]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .filter((r) => matchesPicked(r.school_name));

  const withAddress = appRows.find(
    (r) =>
      cleanStr(r.school_street) && cleanStr(r.school_plz) && cleanStr(r.school_city),
  );
  const withStudents = appRows.find(
    (r) => r.student_count != null && r.student_count > 0,
  );

  if (!bsa && !withAddress && !withStudents) return null;

  return {
    school_name: cleanStr(bsa?.school_name) ?? pickedName,
    principal_name: cleanStr(bsa?.principal_name),
    contact_person: cleanStr(bsa?.contact_person),
    phone: cleanStr(bsa?.contact_phone),
    email: cleanStr(bsa?.contact_email),
    teacher_count:
      bsa?.teacher_count != null && bsa.teacher_count > 0
        ? String(bsa.teacher_count)
        : undefined,
    school_street: withAddress ? cleanStr(withAddress.school_street) : undefined,
    school_plz: withAddress ? cleanStr(withAddress.school_plz) : undefined,
    school_city: withAddress ? cleanStr(withAddress.school_city) : undefined,
    student_count: withStudents ? String(withStudents.student_count) : undefined,
    student_count_band: cleanStr(bsa?.student_count),
  };
}

/** Hilfsfunktion: gibt true zurück, wenn der Wert „plausibel" ist –
 *  d.h. nicht-leer und enthält mindestens ein Buchstaben- oder
 *  Ziffernzeichen. Damit fischen wir reine Punctuation-Werte
 *  („·", ".", " - " etc.) heraus, akzeptieren aber auch einzelne
 *  Ziffern (z.B. teacher_count = 2). */
function hasContent(value: string | undefined): boolean {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  return /[\p{L}\p{N}]/u.test(trimmed);
}

/** Liefert die Liste der Feldnamen, die effektiv aus der BSA übernommen
 *  werden (nicht-leere Werte). */
export function getLockedFieldsFromPrefill(
  prefill: BestandsaufnahmePrefill | null,
): string[] {
  if (!prefill) return [];
  const fields: string[] = [];
  if (hasContent(prefill.school_name)) fields.push("school_name");
  if (hasContent(prefill.principal_name)) fields.push("principal_name");
  if (hasContent(prefill.contact_person)) fields.push("contact_person");
  if (hasContent(prefill.phone)) fields.push("phone");
  if (hasContent(prefill.teacher_count)) fields.push("teacher_count");
  return fields;
}
