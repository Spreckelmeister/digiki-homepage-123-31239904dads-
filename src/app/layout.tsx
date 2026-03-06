import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CookieBanner from "@/components/CookieBanner";
import { OrganizationJsonLd } from "@/components/JsonLd";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.digiki-osnabrueck.de";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
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
      "Digitale Kompetenz und KI für alle Grundschulen in Stadt und Landkreis Osnabrück.",
    type: "website",
    locale: "de_DE",
    siteName: "DigiKI",
  },
  twitter: {
    card: "summary_large_image",
    title: "DigiKI – Digitalisierung & KI an Grundschulen Osnabrück",
    description:
      "Digitale Kompetenz und KI für alle Grundschulen in Stadt und Landkreis Osnabrück.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className={inter.className}>
      <body className="min-h-screen flex flex-col">
        <OrganizationJsonLd />
        <Header />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <Footer />
        <CookieBanner />
      </body>
    </html>
  );
}
