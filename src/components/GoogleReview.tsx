import { Star, ArrowUpRight } from "lucide-react";

const REVIEW_URL = "https://g.page/r/CV8p1BBvVrmHEBM/review";

/** Offizielles Google-„G" in den vier Markenfarben (#4285F4 / #34A853 /
 *  #FBBC05 / #EA4335). Wird unverändert wiedergegeben – das ist
 *  Voraussetzung für die zulässige Verwendung als Verweis auf Google. */
function GoogleLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Google"
    >
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </svg>
  );
}

export default function GoogleReview() {
  return (
    <a
      href={REVIEW_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="DigiKI auf Google bewerten (öffnet in neuem Tab)"
      className="google-review-fab group fixed bottom-4 right-4 z-40 inline-flex items-center gap-2.5 rounded-full border border-border bg-white py-1.5 pl-2 pr-3 shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-xl print:hidden sm:bottom-6 sm:right-6 sm:gap-3 sm:py-2 sm:pl-2.5 sm:pr-4"
    >
      {/* G-Logo mit weichem Glow auf Hover */}
      <span
        className="relative flex h-8 w-8 items-center justify-center sm:h-9 sm:w-9"
        aria-hidden="true"
      >
        <span
          className="absolute inset-0 rounded-full opacity-0 blur-md transition-opacity duration-500 group-hover:opacity-60"
          style={{
            background:
              "conic-gradient(from 90deg, #4285F4, #34A853, #FBBC05, #EA4335, #4285F4)",
          }}
        />
        <GoogleLogo className="relative h-5 w-5 transition-transform duration-300 group-hover:scale-110 sm:h-[22px] sm:w-[22px]" />
      </span>

      {/* Sterne + Text */}
      <span className="flex flex-col items-start gap-0.5 leading-tight">
        <span
          className="hidden items-center gap-[2px] sm:flex"
          aria-hidden="true"
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <Star
              key={i}
              className="google-review-star h-[10px] w-[10px] fill-[#FBBC05] stroke-[#FBBC05]"
              style={{ animationDelay: `${i * 0.12}s` }}
            />
          ))}
        </span>
        <span className="text-[12px] font-semibold tracking-tight text-text sm:text-[13px]">
          Auf Google bewerten
        </span>
      </span>

      <ArrowUpRight
        className="h-3.5 w-3.5 text-text-light transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
        aria-hidden="true"
      />
    </a>
  );
}
