"use client";

import { Search } from "lucide-react";
import type { Category } from "@/lib/types";

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  selectedGrade: string;
  onGradeChange: (grade: string) => void;
  categories: Category[];
}

export default function FilterBar({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedGrade,
  onGradeChange,
  categories,
}: FilterBarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-8">
      <div className="relative flex-1">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light"
          aria-hidden="true"
        />
        <input
          type="text"
          placeholder="Suchen..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-lg border border-border pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-colors"
        />
      </div>
      <select
        value={selectedCategory}
        onChange={(e) => onCategoryChange(e.target.value)}
        className="rounded-lg border border-border px-4 py-3 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-colors bg-white"
      >
        <option value="">Alle Kategorien</option>
        {categories.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.name}
          </option>
        ))}
      </select>
      <select
        value={selectedGrade}
        onChange={(e) => onGradeChange(e.target.value)}
        className="rounded-lg border border-border px-4 py-3 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-colors bg-white"
      >
        <option value="">Alle Klassenstufen</option>
        <option value="1-2">Klasse 1-2</option>
        <option value="3-4">Klasse 3-4</option>
        <option value="1-4">Klasse 1-4</option>
      </select>
    </div>
  );
}
