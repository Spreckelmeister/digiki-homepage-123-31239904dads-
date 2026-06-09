import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // CSS direkt in die HTML-Antwort inlinen → eliminiert den render-blockenden
  // CSS-Fetch aus dem kritischen Pfad (HTML+CSS in einer Response statt zwei).
  experimental: {
    inlineCss: true,
    // Tree-shaking für Lucide-Icons: nur die tatsächlich verwendeten Icons landen im Bundle.
    optimizePackageImports: ["lucide-react"],
  },
  // Edge-AI-Pakete sind Browser-only (laden WASM/WebGPU/Worker) und werden in den
  // Werkzeug-Komponenten ausschließlich per dynamischem `await import()` gezogen.
  // Server-externalisieren stoppt Turbopack/SWC davor, hunderte MB tfjs-/web-llm-/
  // transformers-Source während des SSR-Passes zu durchsuchen → Build geht durch.
  serverExternalPackages: [
    "@tensorflow/tfjs",
    "upscaler",
    "@upscalerjs/default-model",
    "@mediapipe/selfie_segmentation",
    "@xenova/transformers",
    "@huggingface/transformers",
    "@imgly/background-removal",
    "tesseract.js",
    "@mlc-ai/web-llm",
    "@ffmpeg/ffmpeg",
    "@ffmpeg/util",
  ],
  // Packages, die vorkompilierten ES5/ES2015-Code mit Polyfills ausliefern,
  // re-transpilieren wir via SWC auf die Browserslist-Targets (package.json).
  // Spart Array.prototype.at, Object.hasOwn, String.trimEnd/Start etc.
  transpilePackages: [
    "@supabase/ssr",
    "@supabase/supabase-js",
    "@supabase/auth-js",
    "@supabase/postgrest-js",
    "@supabase/realtime-js",
    "@supabase/storage-js",
    "@supabase/functions-js",
    "@supabase/node-fetch",
    "@vercel/analytics",
    "@vercel/speed-insights",
    "@vercel/blob",
    "react-markdown",
    "remark-gfm",
    "remark-parse",
    "mdast-util-from-markdown",
    "micromark",
  ],
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 31536000,
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [64, 128, 256, 384, 600],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            // `microphone=(self)` erlaubt unseren eigenen Werkzeugen
            // (Lärmampel, Audio-Trimmer, Diktiergerät) den Mikrofon-
            // Zugriff und blockt zugleich jeden Drittanbieter oder
            // eingebetteten iframe. Ohne `self` würde Chrome die Anfrage
            // präemptiv abweisen, ohne dem User überhaupt einen
            // Permission-Dialog zu zeigen.
            // Kamera bleibt blockiert: kein Werkzeug nutzt die Webcam.
            key: "Permissions-Policy",
            value: "camera=(), microphone=(self), geolocation=()",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Resource-Policy",
            value: "same-origin",
          },
          {
            key: "X-Permitted-Cross-Domain-Policies",
            value: "none",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // script-src: Erlaubt lokale Scripts + WASM + externe CDN-Scripts (für Tesseract, etc)
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' blob: https://cdn.jsdelivr.net https://raw.githubusercontent.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com",
              "font-src 'self'",
              // connect-src: explizite Allowlist statt `https:`-Wildcard.
              // Begründung pro Host als Inline-Kommentar; jede Erweiterung
              // muss bewusst dokumentiert werden. `blob:` ist nötig, weil
              // FFmpeg.wasm intern `fetch(blobURL)` für den WASM-Core nutzt.
              [
                "connect-src 'self'",
                "https://huggingface.co",                // HF-Apex (Manifeste, resolve-Endpunkt)
                "https://*.huggingface.co",              // HF-LFS-CDN (cdn-lfs, cdn-lfs-us-1, …)
                "https://*.hf.co",                       // HF-Kurzdomain für LFS-Redirects
                "https://cdn.jsdelivr.net",              // mlc-ai/web-llm WASM-Runtime, Tesseract-Fallback
                "https://raw.githubusercontent.com",     // mlc-ai/binary-mlc-llm-libs (WebLLM-WASM-Bibliotheken)
                "https://staticimgly.com",               // @imgly/background-removal Modell + WASM
                "https://tessdata.projectnaptha.com",    // Tesseract.js Sprachpakete (deu.traineddata)
                "https://*.public.blob.vercel-storage.com", // Eigene gespeicherte Bilder
                "https://*.supabase.co",                 // Supabase Auth + REST-API
                "https://api.anthropic.com",             // Arbeitsblatt-Editor: optionaler KI-Assistent (eigener API-Schlüssel der Lehrkraft, Browser-direkt)
                "https://api.openai.com",                // Arbeitsblatt-Editor: optionaler KI-Assistent (eigener API-Schlüssel der Lehrkraft, Browser-direkt)
                "https://vitals.vercel-insights.com",    // Vercel Speed Insights (nur nach Consent)
                "blob:",                                 // FFmpeg-WASM lädt seinen Core via fetch(blob:)
              ].join(" "),
              "worker-src 'self' blob:",
              "media-src 'self' blob:",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "object-src 'none'",
            ].join("; "),
          },
        ],
      },
      {
        // Logos und öffentliche Bilder dürfen von externen Origins (z. B. Email-Clients) geladen werden
        source: "/images/:path*",
        headers: [
          {
            key: "Cross-Origin-Resource-Policy",
            value: "cross-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
