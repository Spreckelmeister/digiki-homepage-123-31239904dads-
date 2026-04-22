"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface AccordionItem {
  question: string;
  answer: string;
}

interface AccordionProps {
  items: AccordionItem[];
}

export default function Accordion({ items }: AccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <AccordionEntry
          key={index}
          item={item}
          isOpen={openIndex === index}
          onToggle={() => setOpenIndex(openIndex === index ? null : index)}
        />
      ))}
    </div>
  );
}

function AccordionEntry({
  item,
  isOpen,
  onToggle,
}: {
  item: AccordionItem;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-bg/50 transition-colors"
        aria-expanded={isOpen}
      >
        <span className="font-medium text-primary pr-4">{item.question}</span>
        <ChevronDown
          className={`w-5 h-5 text-text-light shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>
      {/* Grid-template-rows-Trick: 0fr → 1fr animiert ohne JS-Layout-Read.
          Vermeidet den Forced Reflow, den `scrollHeight` im Inline-Style ausgelöst hat. */}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-6 pb-4 text-sm text-text-light leading-relaxed">
            {item.answer}
          </div>
        </div>
      </div>
    </div>
  );
}
