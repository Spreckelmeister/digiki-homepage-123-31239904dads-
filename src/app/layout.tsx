import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CookieBanner from "@/components/CookieBanner";
import InfoEventBanner from "@/components/InfoEventBanner";
import { OrganizationJsonLd } from "@/components/JsonLd";
import ConsentAnalytics from "@/components/ConsentAnalytics";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://digiki-os.de";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  // Default canonical = Wurzel. Einzelne Seiten überschreiben mit ihrem Pfad.
  // Verhindert, dass Varianten wie https://digiki-os.de/ vs https://www.digiki-os.de/
  // oder UTM-Parameter als Duplicate Content gewertet werden.
  alternates: {
    canonical: "/",
  },
  verification: {
    google: "h9-cmaMDG5FFZLAVyGRxsfxREQtkL8Z4fZgd2XeCD-k",
  },
  title: {
    default: "DigiKI – Digitalisierung & KI an Grundschulen Osnabrück",
    template: "%s | DigiKI",
  },
  description:
    "DigiKI befähigt alle Grundschulen in Stadt und Landkreis Osnabrück zu digitaler Kompetenz und sachgerechtem Umgang mit Künstlicher Intelligenz. Gefördert durch regionale Stiftungen.",
  keywords: [
    "DigiKI",
    "Digitalisierung",
    "Künstliche Intelligenz",
    "Grundschule",
    "Osnabrück",
    "Fortbildung",
    "Lehrkräfte",
    "KI im Unterricht",
  ],
  openGraph: {
    title: "DigiKI – Digitalisierung & KI an Grundschulen Osnabrück",
    description:
      "Kostenlose Schulungen, Tool-Lizenzen und individuelle Begleitung für alle Grundschulen in Stadt und Landkreis Osnabrück. Gefördert durch regionale Stiftungen.",
    type: "website",
    locale: "de_DE",
    siteName: "DigiKI",
    images: [
      {
        url: "https://www.digiki-os.de/images/og-image.png",
        width: 1200,
        height: 630,
        alt: "DigiKI – Digitalisierung & KI an Grundschulen Osnabrück",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DigiKI – Digitalisierung & KI an Grundschulen Osnabrück",
    description:
      "Digitale Kompetenz und KI für alle Grundschulen in Stadt und Landkreis Osnabrück.",
    images: ["https://www.digiki-os.de/images/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: true,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className={inter.className} data-scroll-behavior="smooth">
      <body className="min-h-screen flex flex-col">
        <OrganizationJsonLd />
        <InfoEventBanner />
        <Header />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <Footer />
        <CookieBanner />
        <ConsentAnalytics />
      </body>
    </html>
  );
}
