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

export interface BestandsaufnahmePrefill {
  school_name?: string;
  principal_name?: string;
  contact_person?: string;
  phone?: string;
  teacher_count?: string;
}

type RawBSA = {
  school_name?: string | null;
  principal_name?: string | null;
  contact_person?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  teacher_count?: number | null;
};

export async function getBestandsaufnahmePrefill(): Promise<BestandsaufnahmePrefill | null> {
  const supabase = await createClient();

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
    const {
      data: { user },
    } = await supabase.auth.getUser();
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
          "school_name, principal_name, contact_person, contact_email, contact_phone, teacher_count",
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
            "school_name, principal_name, contact_person, contact_email, contact_phone, teacher_count",
          )
          .ilike("contact_email", user.email)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        raw = byEmail.data as RawBSA | null;
      }
    }
  }

  if (!raw) {
    console.log(
      "[getBestandsaufnahmePrefill] Keine BSA gefunden (RPC + Fallback leer).",
    );
    return null;
  }

  // Diagnose-Log: zeigt die Rohwerte aus der DB. Bei „komische Zeichen"
  // im UI sieht man hier sofort, was tatsächlich gespeichert ist.
  console.log("[getBestandsaufnahmePrefill] rohe DB-Werte:", {
    school_name: JSON.stringify(raw.school_name),
    principal_name: JSON.stringify(raw.principal_name),
    contact_person: JSON.stringify(raw.contact_person),
    contact_phone: JSON.stringify(raw.contact_phone),
    teacher_count: raw.teacher_count,
  });

  // Strings trimmen und leere Werte konsequent zu undefined machen.
  const cleanStr = (v: string | null | undefined): string | undefined => {
    if (typeof v !== "string") return undefined;
    const trimmed = v.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  };

  return {
    school_name: cleanStr(raw.school_name),
    principal_name: cleanStr(raw.principal_name),
    contact_person: cleanStr(raw.contact_person),
    phone: cleanStr(raw.contact_phone),
    teacher_count:
      raw.teacher_count != null && raw.teacher_count > 0
        ? String(raw.teacher_count)
        : undefined,
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
