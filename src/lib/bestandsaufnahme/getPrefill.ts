/**
 * Lädt die jüngste Bestandsaufnahme des angemeldeten Nutzers und
 * extrahiert daraus die Felder, die in den Antrags-Formularen
 * vor-ausgefüllt + gesperrt werden können.
 *
 * Felder, die NICHT in der BSA stehen (Adresse, Schüler:innenzahl als
 * Range-String), bleiben editierbar.
 *
 * Wichtig: Wir nutzen die existierende RPC `get_my_bestandsaufnahme`
 * (security-definer), weil die Tabelle bestandsaufnahme_responses RLS
 * hat und direkte SELECTs aus User-Session deshalb leer zurückkommen.
 */

import { createClient } from "@/lib/supabase/server";

export interface BestandsaufnahmePrefill {
  school_name?: string;
  principal_name?: string;
  contact_person?: string;
  phone?: string;
  teacher_count?: string;
}

type RpcBSA = {
  school_name?: string | null;
  principal_name?: string | null;
  contact_person?: string | null;
  contact_phone?: string | null;
  teacher_count?: number | null;
};

export async function getBestandsaufnahmePrefill(): Promise<BestandsaufnahmePrefill | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_my_bestandsaufnahme");

  if (error) {
    console.error(
      "[getBestandsaufnahmePrefill] rpc error:",
      error.message,
    );
    return null;
  }
  if (!data) {
    console.log("[getBestandsaufnahmePrefill] rpc returned null (keine BSA)");
    return null;
  }

  const r = data as RpcBSA;

  // Debug-Log: in den Server-Logs zeigt sich, welche Rohwerte die RPC
  // tatsächlich liefert. Hilfreich, falls in der UI „komische Zeichen"
  // auftauchen – dann steht hier, was real in der DB ist.
  console.log("[getBestandsaufnahmePrefill] rpc raw:", {
    school_name: JSON.stringify(r.school_name),
    principal_name: JSON.stringify(r.principal_name),
    contact_person: JSON.stringify(r.contact_person),
    contact_phone: JSON.stringify(r.contact_phone),
    teacher_count: r.teacher_count,
  });

  // Strings trimmen und leere Werte konsequent zu undefined machen.
  const cleanStr = (v: string | null | undefined): string | undefined => {
    if (typeof v !== "string") return undefined;
    const trimmed = v.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  };

  return {
    school_name: cleanStr(r.school_name),
    principal_name: cleanStr(r.principal_name),
    contact_person: cleanStr(r.contact_person),
    phone: cleanStr(r.contact_phone),
    teacher_count:
      r.teacher_count != null && r.teacher_count > 0
        ? String(r.teacher_count)
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
  // Mindestens ein alphanumerisches Zeichen (\p{L} = Buchstabe in
  // beliebiger Sprache, \p{N} = Ziffer)
  return /[\p{L}\p{N}]/u.test(trimmed);
}

/** Liefert die Liste der Feldnamen, die effektiv aus der BSA übernommen
 *  werden (nicht-leere Werte). Wird an SchoolInfoFields gereicht, damit
 *  die entsprechenden Eingabefelder als gesperrt gerendert werden. */
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
