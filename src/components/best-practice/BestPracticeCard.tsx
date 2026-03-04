import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { BestPractice } from "@/lib/types";

interface BestPracticeCardProps {
  practice: BestPractice;
}

export default function BestPracticeCard({ practice }: BestPracticeCardProps) {
  const categories =
    practice.best_practice_categories?.map((bpc) => bpc.categories) || [];

  return (
    <article className="bg-white rounded-xl p-6 shadow-sm border border-border hover:shadow-md transition-shadow flex flex-col">
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-primary mb-1">
          {practice.title}
        </h3>
        <p className="text-sm font-medium text-accent mb-2">
          {practice.school_name}
        </p>
        <div className="flex flex-wrap gap-2 text-xs text-text-light mb-3">
          <span>{practice.subject}</span>
          <span aria-hidden="true">&middot;</span>
          <span>Klasse {practice.grade_level}</span>
        </div>
        <p className="text-sm text-text-light line-clamp-3 mb-4">
          {practice.summary}
        </p>
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {categories.map((cat) => (
              <span
                key={cat.id}
                className="inline-flex bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full"
              >
                {cat.name}
              </span>
            ))}
          </div>
        )}
      </div>
      <Link
        href={`/best-practice/datenbank/${practice.id}`}
        className="inline-flex items-center gap-1 text-sm font-medium text-primary-light hover:text-primary transition-colors"
      >
        Mehr lesen
        <ArrowRight className="w-4 h-4" aria-hidden="true" />
      </Link>
    </article>
  );
}
