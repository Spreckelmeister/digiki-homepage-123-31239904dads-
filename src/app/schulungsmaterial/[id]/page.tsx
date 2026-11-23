import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/schulungen/server";
import MaterialViewer from "@/components/material/MaterialViewer";
import { MATERIAL_BUCKET, type MaterialItem } from "@/lib/material/shared";

export const metadata: Metadata = {
  title: "Schulungsmaterial - DigiKI",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

// Gültigkeit des Ansichts-Links: lang genug zum Abspielen und Spulen bzw.
// zum Durchblättern (PDF-Seiten werden beim Scrollen nachgeladen).
const LINK_SECONDS = { video: 4 * 3600, audio: 4 * 3600, pdf: 4 * 3600, image: 600 };

export default async function MaterialDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      `/best-practice/login?redirect=${encodeURIComponent(`/schulungsmaterial/${id}`)}`
    );
  }

  // Der Zugriff entscheidet sich in der Datenbank (RLS): Schulkonten sehen
  // nur Freigeschaltetes, Admins auch Entwürfe (Vorschau).
  const { data } = await supabase
    .from("schulungsmaterial")
    .select("*")
    .eq("id", id)
    .eq("uploaded", true)
    .maybeSingle();
  const item = data as MaterialItem | null;
  if (!item) notFound();

  // Erst NACH der Prüfung: kurzlebiger Link auf die Datei im privaten Bucket.
  const { data: signed } = await createServiceClient()
    .storage.from(MATERIAL_BUCKET)
    .createSignedUrl(item.storage_path, LINK_SECONDS[item.kind]);

  return (
    <>
      <section className="bg-primary py-10 md:py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/schulungsmaterial"
            className="inline-flex items-center gap-1 text-sm text-white/70 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Zurück zum Schulungsmaterial
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            {item.title}
          </h1>
          {!item.published && (
            <p className="mt-2 inline-block rounded bg-yellow-100 px-2 py-0.5 text-sm font-medium text-yellow-900">
              Vorschau – noch nicht freigeschaltet
            </p>
          )}
        </div>
      </section>

      <section className="bg-bg py-8 md:py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {item.description && (
            <p className="mb-6 whitespace-pre-line text-text-light leading-relaxed">
              {item.description}
            </p>
          )}
          {signed?.signedUrl ? (
            <MaterialViewer
              kind={item.kind}
              url={signed.signedUrl}
              title={item.title}
            />
          ) : (
            <p role="alert" className="rounded-xl border border-border bg-white p-8 text-text-light">
              Die Datei kann im Moment nicht geladen werden. Bitte versuchen
              Sie es später erneut.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
