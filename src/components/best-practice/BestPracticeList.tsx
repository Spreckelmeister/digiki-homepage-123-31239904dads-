"use client";

import { useState } from "react";
import type { BestPractice, Category } from "@/lib/types";
import BestPracticeCard from "./BestPracticeCard";
import FilterBar from "./FilterBar";

interface BestPracticeListProps {
  practices: BestPractice[];
  categories: Category[];
}

export default function BestPracticeList({
  practices,
  categories,
}: BestPracticeListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");

  const filtered = practices.filter((p) => {
    const matchesSearch =
      !searchQuery ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.school_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.subject.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      !selectedCategory ||
      p.best_practice_categories?.some(
        (bpc) => bpc.categories.id === selectedCategory
      );

    const matchesGrade = !selectedGrade || p.grade_level === selectedGrade;

    return matchesSearch && matchesCategory && matchesGrade;
  });

  return (
    <>
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        selectedGrade={selectedGrade}
        onGradeChange={setSelectedGrade}
        categories={categories}
      />

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((practice) => (
            <BestPracticeCard key={practice.id} practice={practice} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-lg text-text-light">
            {practices.length === 0
              ? "Noch keine Best-Practice-Beiträge vorhanden."
              : "Keine Ergebnisse für Ihre Filterauswahl."}
          </p>
        </div>
      )}
    </>
  );
}
