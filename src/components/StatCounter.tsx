"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface StatCounterProps {
  value: string;
  label: string;
  description: string;
}

function parseValue(raw: string) {
  const match = raw.match(/^([^\d]*?)([\d.]+)(.*)$/);
  if (!match) return { prefix: "", number: 0, suffix: raw, decimals: false };

  const prefix = match[1];
  const numStr = match[2];
  const suffix = match[3];

  // German-style "240.000" → 240000, not 240.0
  const hasThousandDots = /\d{1,3}(\.\d{3})+$/.test(numStr);
  const number = hasThousandDots
    ? parseInt(numStr.replace(/\./g, ""), 10)
    : parseFloat(numStr);

  return { prefix, number, suffix, decimals: !hasThousandDots && numStr.includes(".") };
}

function formatNumber(n: number, useThousandDots: boolean): string {
  if (useThousandDots) {
    return Math.round(n)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }
  return Math.round(n).toString();
}

const DURATION = 1600; // ms

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

export default function StatCounter({ value, label, description }: StatCounterProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isVisible, setIsVisible] = useState(false);
  const hasAnimated = useRef(false);
  const ref = useRef<HTMLDivElement>(null);

  const { prefix, number: target, suffix } = parseValue(value);
  const useThousandDots = /\d{1,3}(\.\d{3})+/.test(value);

  const animate = useCallback(() => {
    if (hasAnimated.current || target === 0) return;
    hasAnimated.current = true;

    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / DURATION, 1);
      const eased = easeOutQuart(progress);
      const current = eased * target;

      setDisplayValue(`${prefix}${formatNumber(current, useThousandDots)}${suffix}`);

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        // Ensure final value matches exactly
        setDisplayValue(value);
      }
    }

    requestAnimationFrame(tick);
  }, [target, prefix, suffix, useThousandDots, value]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          animate();
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [animate]);

  return (
    <div
      ref={ref}
      className={`text-center p-4 md:p-6 transition-opacity duration-700 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="text-3xl md:text-4xl font-bold text-accent-strong mb-1 tabular-nums whitespace-nowrap">
        {/* Layout-stabiler Rahmen: der unsichtbare Endwert reserviert die Breite,
            damit die Animation keine Forced-Reflows auf Mobile auslöst.
            Screen-Reader lesen den finalen Wert; der sichtbare Zahl-Lauf ist aria-hidden. */}
        <span className="relative inline-block">
          <span className="invisible">{value}</span>
          <span aria-hidden="true" className="absolute inset-0">
            {displayValue}
          </span>
        </span>
      </div>
      <div className="text-lg font-semibold text-primary">{label}</div>
      <div className="text-sm text-text-light mt-1">{description}</div>
    </div>
  );
}
