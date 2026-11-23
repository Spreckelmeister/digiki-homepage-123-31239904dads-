import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/schulungen/server";
import { requireAdmin } from "@/lib/material/server";
import { MATERIAL_BUCKET } from "@/lib/material/shared";

// Admin: Schulungsmaterial löschen – Eintrag UND Datei im Bucket.

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const admin = createServiceClient();
  const { data: item } = await admin
    .from("schulungsmaterial")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();
  if (!item) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  }

  // Erst die Datei: bleibt sie liegen, soll auch der Eintrag sichtbar bleiben.
  const { error: removeError } = await admin.storage
    .from(MATERIAL_BUCKET)
    .remove([item.storage_path]);
  if (removeError) {
    console.error("[admin/schulungsmaterial] remove:", removeError.message);
    return NextResponse.json(
      { error: "Die Datei konnte nicht gelöscht werden." },
      { status: 500 }
    );
  }

  const { error: deleteError } = await admin
    .from("schulungsmaterial")
    .delete()
    .eq("id", id);
  if (deleteError) {
    return NextResponse.json(
      { error: "Der Eintrag konnte nicht gelöscht werden." },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true });
}
