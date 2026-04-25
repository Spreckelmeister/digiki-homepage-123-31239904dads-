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
            // (Lärmampel, Audio-Trimmer) den Mikrofon-Zugriff und blockt
            // zugleich jeden Drittanbieter oder eingebetteten iframe.
            // Ohne `self` würde Chrome die Anfrage präemptiv abweisen,
            // ohne dem User überhaupt einen Permission-Dialog zu zeigen.
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
              // 'unsafe-eval' für React Dev Mode (debugging callstacks)
              // 'wasm-unsafe-eval' für tfjs/MediaPipe/Whisper/Tesseract/WebLLM/FFmpeg
              // (alle laden WASM). blob: für FFmpeg-Core via toBlobURL und Worker-Bundles.
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' blob:",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com",
              "font-src 'self'",
              // CDN-Origins für Edge-AI-Modelle (Datenschutz: nur statische Modell-Dateien,
              // Nutzer-Inhalte werden NIE zu diesen Hosts gesendet).
              [
                "connect-src 'self'",
                "https://*.supabase.co",
                // Whisper-Modelle (transformers.js) + MLC-LLM Gemma
                "https://huggingface.co",
                "https://*.huggingface.co",
                // MediaPipe selfie_segmentation, Tesseract-Core, ggf. WebLLM-Configs
                "https://cdn.jsdelivr.net",
                // Tesseract Sprachpakete
                "https://tessdata.projectnaptha.com",
                // FFmpeg-Core
                "https://unpkg.com",
                // WebLLM Modell-Konfigs + GitHub releases
                "https://raw.githubusercontent.com",
                "https://github.com",
                "https://api.github.com",
                // MLC-LLM model libraries
                "https://github.com/mlc-ai",
                "https://ghe.blob.core.windows.net",
              ].join(" "),
              // Worker als blob: (FFmpeg-Worker) oder same-origin (Whisper-Worker bundled).
              "worker-src 'self' blob:",
              // Video-/Audio-Vorschau in WZ-012/15 nutzt Object-URLs (blob:).
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
