"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const navigation = [
  { name: "Startseite", href: "/" },
  { name: "Über das Projekt", href: "/ueber-das-projekt" },
  { name: "Für Schulen", href: "/fuer-schulen" },
  { name: "Best Practice", href: "/best-practice" },
  // Weitere Seiten können hier ergänzt werden:
  // { name: "Termine", href: "/termine" },
  // { name: "Netzwerk", href: "/netzwerk" },
  // { name: "Aktuelles", href: "/aktuelles" },
];

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <a href="#main-content" className="skip-link">
        Zum Inhalt springen
      </a>
      <nav
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
        aria-label="Hauptnavigation"
      >
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link
              href="/"
              className="flex items-center gap-2 text-xl font-bold text-primary"
            >
              <span className="text-2xl">DigiKI</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:gap-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-text hover:bg-bg hover:text-primary transition-colors"
              >
                {item.name}
              </Link>
            ))}
            <Link
              href="/fuer-schulen#teilnahme"
              className="ml-3 inline-flex items-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
            >
              Jetzt teilnehmen
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-lg p-2 text-text hover:bg-bg"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-label="Menü öffnen"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4">
            <div className="flex flex-col gap-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="rounded-lg px-3 py-2 text-base font-medium text-text hover:bg-bg hover:text-primary transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              <Link
                href="/fuer-schulen#teilnahme"
                className="mt-2 inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-base font-semibold text-white hover:bg-accent-hover transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Jetzt teilnehmen
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
