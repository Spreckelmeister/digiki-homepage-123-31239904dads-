"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

/**
 * Leichte Fade-in-Animation beim Scrollen – CSS-only via IntersectionObserver.
 * Ersetzt eine frühere Framer-Motion-Variante und spart dadurch ~35 KiB JS-Bundle.
 */
export default function AnimatedSection({
  children,
  className,
  delay = 0,
}: AnimatedSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respektiere Nutzer-Präferenz "Bewegung reduzieren" – direkt anzeigen
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -80px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: delay ? `${delay}s` : undefined }}
      className={`transition-opacity duration-500 ease-out ${
        visible ? "opacity-100" : "opacity-0"
      } ${className ?? ""}`.trim()}
    >
      {children}
    </div>
  );
}
