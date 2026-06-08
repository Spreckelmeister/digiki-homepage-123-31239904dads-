/**
 * Lädt die jüngste Bestandsaufnahme des angemeldeten Nutzers und
 * extrahiert daraus die Felder, die in den Antrags-Formularen
 * vor-ausgefüllt + gesperrt werden können.
 *
 * Felder, die NICHT in der BSA stehen (Adresse, Schüler:innenzahl als
 * Range-String), bleiben editierbar.
 */

import { createClient } from "@/lib/supabase/server";

export interface BestandsaufnahmePrefill {
  school_name?: string;
  principal_name?: string;
  contact_person?: string;
  phone?: string;
  teacher_count?: string;
}

export async function getBestandsaufnahmePrefill(
  userId: string,
): Promise<BestandsaufnahmePrefill | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("bestandsaufnahme_responses")
    .select(
      "school_name, principal_name, contact_person, contact_phone, teacher_count",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  // Strings trimmen und leere Werte konsequent zu undefined machen –
  // damit auch versehentliche "  "-Strings nicht als Lock auftauchen.
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

/** Hilfsfunktion: gibt true zurück, wenn der Wert ein echter, nicht-leerer
 *  String ist (auch nicht reines Whitespace). */
function hasContent(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/** Liefert die Liste der Feldnamen, die effektiv aus der BSA übernommen
 *  werden (nicht-leere Werte). Wird an SchoolInfoFields gereicht, damit
 *  die entsprechenden Eingabefelder als gesperrt gerendert werden.
 *
 *  Leere Strings, NULL und reine Whitespace-Werte werden bewusst NICHT
 *  gelockt – sonst sieht der Nutzer ein gesperrtes Feld ohne Inhalt
 *  und kann es weder ausfüllen noch korrigieren. */
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
