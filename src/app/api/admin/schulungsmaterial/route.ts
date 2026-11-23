import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/schulungen/server";
import { requireAdmin } from "@/lib/material/server";
import { MATERIAL_BUCKET, kindFromMime } from "@/lib/material/shared";

// Admin: neues Schulungsmaterial anlegen (Migration 038).
// Legt den Eintrag als Entwurf an und gibt einen einmaligen Upload-Link
// zurück. Die Datei geht damit direkt vom Browser in den privaten Bucket
// (nicht durch diese Route – Vercel begrenzt Anfragen auf wenige MB).

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim().slice(0, 200) : "";
  const description =
    typeof body.description === "string" ? body.description.trim().slice(0, 4000) : "";
  const fileName = typeof body.fileName === "string" ? body.fileName.slice(0, 200) : "";
  const mimeType = typeof body.mimeType === "string" ? body.mimeType.toLowerCase() : "";
  const size = typeof body.size === "number" && body.size > 0 ? Math.floor(body.size) : 0;

  if (!title) {
    return NextResponse.json({ error: "Bitte einen Titel angeben." }, { status: 400 });
  }
  const kind = kindFromMime(mimeType);
  if (!kind || !fileName || !size) {
    return NextResponse.json(
      {
        error:
          "Dieser Dateityp lässt sich nicht im Browser ansehen. Möglich sind HTML-Dateien, Video (MP4, WebM), Audio, PDF und Bilder – Präsentationen bitte als PDF speichern.",
      },
      { status: 400 }
    );
  }

  const id = crypto.randomUUID();
  const ext = (fileName.match(/\.([A-Za-z0-9]{1,8})$/)?.[1] ?? "bin").toLowerCase();
  const storagePath = `${id}/datei.${ext}`;

  const admin = createServiceClient();
  const { data: last } = await admin
    .from("schulungsmaterial")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error: insertError } = await admin.from("schulungsmaterial").insert({
    id,
    title,
    description,
    kind,
    storage_path: storagePath,
    mime_type: mimeType,
    size_bytes: size,
    original_name: fileName,
    sort_order: (last?.sort_order ?? 0) + 10,
    created_by: auth.userId,
  });
  if (insertError) {
    console.error("[admin/schulungsmaterial] insert:", insertError.message);
    return NextResponse.json(
      { error: "Eintrag konnte nicht angelegt werden (Migration 038 ausgeführt?)." },
      { status: 500 }
    );
  }

  const { data: upload, error: uploadError } = await admin.storage
    .from(MATERIAL_BUCKET)
    .createSignedUploadUrl(storagePath);
  if (uploadError || !upload) {
    console.error("[admin/schulungsmaterial] upload url:", uploadError?.message);
    await admin.from("schulungsmaterial").delete().eq("id", id);
    return NextResponse.json(
      { error: "Der Upload konnte nicht vorbereitet werden." },
      { status: 500 }
    );
  }

  return NextResponse.json({ id, path: upload.path, token: upload.token });
}
