"use client";

import { useEffect, useRef, useState } from "react";

interface TimelinePhase {
  phase: number;
  title: string;
  period: string;
  description: string;
  items: string[];
}

interface TimelineProps {
  phases: TimelinePhase[];
}

export default function Timeline({ phases }: TimelineProps) {
  const [visiblePhases, setVisiblePhases] = useState<Set<number>>(new Set());
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute("data-index"));
            setVisiblePhases((prev) => new Set(prev).add(index));
          }
        });
      },
      { threshold: 0.2 }
    );

    refs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative">
      {/* Vertikale Linie */}
      <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-border md:-translate-x-px" />

      <div className="space-y-12">
        {phases.map((phase, index) => {
          const isLeft = index % 2 === 0;
          const isVisible = visiblePhases.has(index);

          return (
            <div
              key={phase.phase}
              ref={(el) => { refs.current[index] = el; }}
              data-index={index}
              className={`relative flex items-start gap-6 md:gap-0 transition-all duration-700 ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-8"
              }`}
            >
              {/* Punkt auf der Linie */}
              <div className="absolute left-4 md:left-1/2 w-4 h-4 bg-accent rounded-full border-4 border-white shadow -translate-x-1/2 mt-1 z-10" />

              {/* Content */}
              <div
                className={`ml-12 md:ml-0 md:w-1/2 ${
                  isLeft ? "md:pr-12" : "md:pl-12 md:ml-auto"
                }`}
              >
                <div className="bg-white rounded-xl p-6 shadow-sm border border-border">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white text-sm font-bold">
                      {phase.phase}
                    </span>
                    <span className="text-sm font-medium text-accent">
                      {phase.period}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-primary mb-2">
                    {phase.title}
                  </h3>
                  <p className="text-sm text-text-light mb-4">
                    {phase.description}
                  </p>
                  <ul className="space-y-1.5">
                    {phase.items.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-text"
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0"
                          aria-hidden="true"
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
