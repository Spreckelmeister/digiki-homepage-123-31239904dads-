import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CookieBanner from "@/components/CookieBanner";

export const metadata: Metadata = {
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col">
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
