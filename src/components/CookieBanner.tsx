"use client";

import { useState, useEffect, useRef } from "react";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const acceptButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const consent = localStorage.getItem("digiki-cookie-consent");
    if (!consent) {
      setVisible(true);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      // Tab-Nutzer finden die Buttons sofort, ohne durch den gesamten
      // Hauptinhalt navigieren zu müssen.
      const id = window.setTimeout(() => acceptButtonRef.current?.focus(), 50);
      return () => window.clearTimeout(id);
    }
  }, [visible]);

  const accept = () => {
    localStorage.setItem("digiki-cookie-consent", "accepted");
    window.dispatchEvent(new Event("cookie-consent-changed"));
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem("digiki-cookie-consent", "declined");
    window.dispatchEvent(new Event("cookie-consent-changed"));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <section
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border shadow-lg p-4 md:p-6 print:hidden"
      role="region"
      aria-labelledby="cookie-banner-heading"
      aria-describedby="cookie-banner-description"
    >
      <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="flex-1">
          <h2 id="cookie-banner-heading" className="sr-only">
            Cookie-Einstellungen
          </h2>
          <p id="cookie-banner-description" className="text-sm text-text">
            Diese Website verwendet technisch notwendige Cookies, um die
            bestmögliche Funktionalität zu gewährleisten. Weitere Informationen
            finden Sie in unserer{" "}
            <a
              href="/datenschutz"
              className="text-primary underline hover:text-primary/80"
            >
              Datenschutzerklärung
            </a>
            .
          </p>
        </div>
        <div className="flex gap-3 shrink-0">
          <button
            type="button"
            onClick={decline}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-bg transition-colors"
          >
            Nur notwendige
          </button>
          <button
            ref={acceptButtonRef}
            type="button"
            onClick={accept}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-light transition-colors"
          >
            Alle akzeptieren
          </button>
        </div>
      </div>
    </section>
  );
}
