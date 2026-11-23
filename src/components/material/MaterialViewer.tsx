"use client";

import dynamic from "next/dynamic";
import type { MaterialKind } from "@/lib/material/shared";

const PdfViewer = dynamic(() => import("./PdfViewer"), {
  ssr: false,
  loading: () => <p className="text-text-light">Dokument wird geladen …</p>,
});

/**
 * Zeigt Schulungsmaterial nur zur ANSICHT: kein Download-Knopf, kein
 * Kontextmenü („Speichern unter"), PDF ohne Browser-Leiste. Das ist eine
 * Hürde, kein Kopierschutz – was im Browser abgespielt wird, lässt sich
 * mit technischem Aufwand immer mitschneiden.
 */
export default function MaterialViewer({
  kind,
  url,
  title,
}: {
  kind: MaterialKind;
  url: string;
  title: string;
}) {
  const noMenu = (e: React.MouseEvent) => e.preventDefault();

  if (kind === "video") {
    return (
      <video
        src={url}
        controls
        controlsList="nodownload noremoteplayback"
        disablePictureInPicture
        playsInline
        preload="metadata"
        onContextMenu={noMenu}
        aria-label={title}
        className="w-full rounded-xl bg-black shadow-sm"
      />
    );
  }

  if (kind === "audio") {
    return (
      <audio
        src={url}
        controls
        controlsList="nodownload"
        preload="metadata"
        onContextMenu={noMenu}
        aria-label={title}
        className="w-full"
      />
    );
  }

  if (kind === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- signierter Link aus privatem Bucket
      <img
        src={url}
        alt={title}
        draggable={false}
        onContextMenu={noMenu}
        className="mx-auto max-w-full rounded-xl shadow-sm select-none"
      />
    );
  }

  return <PdfViewer url={url} title={title} />;
}
