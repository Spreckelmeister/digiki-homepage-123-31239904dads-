"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// Dynamisch nachladen: Analytics + SpeedInsights landen erst dann im Client-Bundle,
// wenn der Nutzer Cookies akzeptiert hat. Ohne Consent kein Netzwerk-Call, kein JS.
const Analytics = dynamic(
  () => import("@vercel/analytics/react").then((m) => m.Analytics),
  { ssr: false }
);
const SpeedInsights = dynamic(
  () => import("@vercel/speed-insights/next").then((m) => m.SpeedInsights),
  { ssr: false }
);

export default function ConsentAnalytics() {
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    const check = () => {
      const consent = localStorage.getItem("digiki-cookie-consent");
      setConsented(consent === "accepted");
    };

    check();

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
