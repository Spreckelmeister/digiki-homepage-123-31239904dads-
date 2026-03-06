import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "DigiKI – Digitalisierung & KI an Grundschulen Osnabrück";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #0d3b66 0%, #145374 50%, #0d3b66 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px",
        }}
      >
        {/* Logo text */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "32px",
          }}
        >
          <span
            style={{
              fontSize: "80px",
              fontWeight: 700,
              color: "#00cabe",
              letterSpacing: "-2px",
            }}
          >
            Digi
          </span>
          <span
            style={{
              fontSize: "80px",
              fontWeight: 700,
              color: "#E8A838",
              letterSpacing: "-2px",
            }}
          >
            KI
          </span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: "32px",
            color: "white",
            textAlign: "center",
            lineHeight: 1.4,
            maxWidth: "900px",
          }}
        >
          Digitalisierung &amp; KI an Grundschulen Osnabrück
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: "20px",
            color: "rgba(255,255,255,0.7)",
            marginTop: "20px",
            textAlign: "center",
          }}
        >
          Digitale Kompetenz für alle Grundschulen in Stadt und Landkreis Osnabrück
        </div>

        {/* Bottom bar */}
        <div
          style={{
            position: "absolute",
            bottom: "0",
            left: "0",
            right: "0",
            height: "6px",
            background: "linear-gradient(90deg, #00cabe, #E8A838)",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
