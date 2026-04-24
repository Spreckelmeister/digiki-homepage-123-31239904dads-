// Gemeinsame Mikrofon-Diagnose für Lärmampel und Audio-Trimmer.
// Sammelt in einem Durchgang die Antworten aller relevanten Browser-APIs
// und erkennt die typischen „Chrome fragt nie"-Fälle.

export interface MicDiagnostics {
  /** Ist die moderne mediaDevices-API überhaupt vorhanden? */
  mediaDevicesAvailable: boolean;
  /** Wird die Seite über HTTPS (oder localhost) ausgeliefert? */
  secureContext: boolean;
  /**
   * Permission-State laut Permissions API.
   *   - "granted": erlaubt, getUserMedia sollte direkt gehen
   *   - "prompt":  Dialog wird beim ersten Aufruf erscheinen
   *   - "denied":  Chrome hat die Berechtigung permanent blockiert
   *   - "unknown": Permissions API nicht verfügbar (z. B. ältere Safari-Versionen)
   */
  permissionState: "granted" | "prompt" | "denied" | "unknown";
  /** Erkennung häufiger In-App-Browser mit eingeschränkten WebAPIs */
  inAppBrowser:
    | { kind: "instagram" | "facebook" | "line" | "wechat" | "tiktok" | "other" }
    | null;
  userAgent: string;
}

const IN_APP_PATTERNS: Array<{ re: RegExp; kind: MicDiagnostics["inAppBrowser"] extends null ? never : NonNullable<MicDiagnostics["inAppBrowser"]>["kind"] }> = [
  { re: /\bInstagram\b/i, kind: "instagram" },
  { re: /\bFBAN|FBAV|FB_IAB\b/i, kind: "facebook" },
  { re: /\bLine\/[\d.]+/i, kind: "line" },
  { re: /\bMicroMessenger\b/i, kind: "wechat" },
  { re: /\bTikTok|Musical_ly\b/i, kind: "tiktok" },
];

export async function diagnoseMicrophone(): Promise<MicDiagnostics> {
  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";

  const mediaDevicesAvailable =
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function";

  const secureContext =
    typeof window !== "undefined" &&
    (window.isSecureContext ??
      (window.location?.protocol === "https:" || window.location?.hostname === "localhost"));

  let permissionState: MicDiagnostics["permissionState"] = "unknown";
  if (
    typeof navigator !== "undefined" &&
    navigator.permissions &&
    typeof navigator.permissions.query === "function"
  ) {
    try {
      
      const status = await navigator.permissions.query({ name: "microphone" });
      if (
        status.state === "granted" ||
        status.state === "prompt" ||
        status.state === "denied"
      ) {
        permissionState = status.state;
      }
    } catch {
      /* Browser kennt den permission-name nicht – "unknown" bleibt */
    }
  }

  let inAppBrowser: MicDiagnostics["inAppBrowser"] = null;
  for (const p of IN_APP_PATTERNS) {
    if (p.re.test(userAgent)) {
      inAppBrowser = { kind: p.kind };
      break;
    }
  }

  return {
    mediaDevicesAvailable,
    secureContext,
    permissionState,
    inAppBrowser,
    userAgent,
  };
}

export function humanizeDiagnostics(d: MicDiagnostics): string {
  const parts: string[] = [];
  parts.push(`API: ${d.mediaDevicesAvailable ? "✓" : "✗"}`);
  parts.push(`HTTPS: ${d.secureContext ? "✓" : "✗"}`);
  parts.push(`Permission: ${d.permissionState}`);
  if (d.inAppBrowser) parts.push(`InApp: ${d.inAppBrowser.kind}`);
  return parts.join(" · ");
}
