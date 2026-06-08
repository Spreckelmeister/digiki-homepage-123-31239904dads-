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

  return {
    school_name: data.school_name ?? undefined,
    principal_name: data.principal_name ?? undefined,
    contact_person: data.contact_person ?? undefined,
    phone: data.contact_phone ?? undefined,
    teacher_count:
      data.teacher_count != null ? String(data.teacher_count) : undefined,
  };
}

/** Liefert die Liste der Feldnamen, die effektiv aus der BSA übernommen
 *  werden (nicht-leere Werte). Wird an SchoolInfoFields gereicht, damit
 *  die entsprechenden Eingabefelder als gesperrt gerendert werden. */
export function getLockedFieldsFromPrefill(
  prefill: BestandsaufnahmePrefill | null,
): string[] {
  if (!prefill) return [];
  const fields: string[] = [];
  if (prefill.school_name) fields.push("school_name");
  if (prefill.principal_name) fields.push("principal_name");
  if (prefill.contact_person) fields.push("contact_person");
  if (prefill.phone) fields.push("phone");
  if (prefill.teacher_count) fields.push("teacher_count");
  return fields;
}
