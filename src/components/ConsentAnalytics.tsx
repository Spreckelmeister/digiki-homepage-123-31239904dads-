"use client";

import { useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

export default function ConsentAnalytics() {
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    const check = () => {
      const consent = localStorage.getItem("digiki-cookie-consent");
      setConsented(consent === "accepted");
    };

    check();

    // Reagiert auf Änderungen (wenn Nutzer den Banner klickt)
    window.addEventListener("storage", check);
    window.addEventListener("cookie-consent-changed", check);
    return () => {
      window.removeEventListener("storage", check);
      window.removeEventListener("cookie-consent-changed", check);
    };
  }, []);

  if (!consented) return null;

  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
