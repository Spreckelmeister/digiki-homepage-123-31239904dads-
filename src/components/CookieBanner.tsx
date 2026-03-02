"use client";

import { useState, useEffect } from "react";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("digiki-cookie-consent");
    if (!consent) {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    localStorage.setItem("digiki-cookie-consent", "accepted");
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem("digiki-cookie-consent", "declined");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border shadow-lg p-4 md:p-6"
      role="dialog"
      aria-label="Cookie-Einstellungen"
    >
      <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="flex-1">
          <p className="text-sm text-text">
            Diese Website verwendet technisch notwendige Cookies, um die
            bestmögliche Funktionalität zu gewährleisten. Weitere Informationen
            finden Sie in unserer{" "}
            <a
              href="/datenschutz"
              className="text-primary-light underline hover:text-primary"
            >
              Datenschutzerklärung
            </a>
            .
          </p>
        </div>
        <div className="flex gap-3 shrink-0">
          <button
            onClick={decline}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-bg transition-colors"
          >
            Nur notwendige
          </button>
          <button
            onClick={accept}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-light transition-colors"
          >
            Alle akzeptieren
          </button>
        </div>
      </div>
    </div>
  );
}
