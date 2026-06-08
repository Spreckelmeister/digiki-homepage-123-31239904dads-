/**
 * Lädt die jüngste Bestandsaufnahme des angemeldeten Nutzers und
 * extrahiert daraus die Felder, die in den Antrags-Formularen
 * vor-ausgefüllt + gesperrt werden können.
 *
 * Felder, die NICHT in der BSA stehen (Adresse, Schüler:innenzahl als
 * Range-String), bleiben editierbar.
 *
 * Strategie: nutzt den Service-Role-Admin-Client direkt – umgeht damit
 * RLS und alle möglichen RPC-Eigenheiten. Auth-Schutz besteht durch
 * den User-Session-Lookup vorab.
 */

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export interface BestandsaufnahmePrefill {
  school_name?: string;
  principal_name?: string;
  contact_person?: string;
  phone?: string;
  teacher_count?: string;
}

export async function getBestandsaufnahmePrefill(): Promise<BestandsaufnahmePrefill | null> {
  // Erst: User über Session identifizieren
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    console.log(
      "[getBestandsaufnahmePrefill] Kein eingeloggter User – kein Prefill.",
    );
    return null;
  }

  // Dann: BSA via Admin-Client (Service-Role) holen. Match per user_id
  // ODER per contact_email (gleiche Logik wie die get_my_bestandsaufnahme-
  // RPC), damit auch ältere BSAs ohne user_id-Link gefunden werden.
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    console.error(
      "[getBestandsaufnahmePrefill] Service-Role-Key oder Supabase-URL fehlen.",
    );
    return null;
  }
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const emailLower = user.email?.toLowerCase() ?? "";
  const { data, error } = await admin
    .from("bestandsaufnahme_responses")
    .select(
      "school_name, principal_name, contact_person, contact_email, contact_phone, teacher_count, user_id, created_at",
    )
    .or(
      `user_id.eq.${user.id}${emailLower ? `,contact_email.ilike.${emailLower}` : ""}`,
    )
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      "[getBestandsaufnahmePrefill] admin query error:",
      error.message,
    );
    return null;
  }
  if (!data) {
    console.log(
      `[getBestandsaufnahmePrefill] Keine BSA gefunden für user_id=${user.id} / email=${emailLower}`,
    );
    return null;
  }

  // Klares Diagnose-Log: zeigt rohe DB-Werte (inkl. NULL/empty) für
  // jedes prefill-relevante Feld. Bei „komische Zeichen"-Reports kann
  // man hier sofort sehen, was wirklich in der DB steht.
  console.log(
    `[getBestandsaufnahmePrefill] BSA-Treffer für ${emailLower}:`,
    {
      school_name: JSON.stringify(data.school_name),
      principal_name: JSON.stringify(data.principal_name),
      contact_person: JSON.stringify(data.contact_person),
      contact_phone: JSON.stringify(data.contact_phone),
      teacher_count: data.teacher_count,
      matched_by_user_id: data.user_id === user.id,
      matched_by_email: data.contact_email?.toLowerCase() === emailLower,
    },
  );

  // Strings trimmen und leere Werte konsequent zu undefined machen.
  const cleanStr = (v: string | null | undefined): string | undefined => {
    if (typeof v !== "string") return undefined;
    const trimmed = v.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  };

  return {
    school_name: cleanStr(data.school_name),
    principal_name: cleanStr(data.principal_name),
    contact_person: cleanStr(data.contact_person),
    phone: cleanStr(data.contact_phone),
    teacher_count:
      data.teacher_count != null && data.teacher_count > 0
        ? String(data.teacher_count)
        : undefined,
  };
}

/** Hilfsfunktion: gibt true zurück, wenn der Wert „plausibel" ist –
 *  d.h. nicht-leer, mindestens 2 Zeichen, enthält mindestens ein
 *  Buchstaben- oder Ziffernzeichen. Damit fischen wir auch Werte wie
 *  "·", ".", " - " etc. heraus, die zwar technisch ein Wert sind,
 *  aber offensichtlich keine echten Stammdaten. */
function hasContent(value: string | undefined): boolean {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed.length < 2) return false;
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
