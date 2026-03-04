"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { BestPractice } from "@/lib/types";

interface AdminTableProps {
  practices: BestPractice[];
}

export default function AdminTable({ practices }: AdminTableProps) {
  const router = useRouter();

  async function handleDelete(id: string, title: string) {
    if (!confirm(`"${title}" wirklich löschen? Dies kann nicht rückgängig gemacht werden.`)) {
      return;
    }

    const supabase = createClient();
    await supabase.from("best_practice_categories").delete().eq("best_practice_id", id);
    await supabase.from("best_practices").delete().eq("id", id);
    router.refresh();
  }

  if (practices.length === 0) {
    return (
      <div className="text-center py-12 text-text-light">
        Noch keine Best-Practice-Beiträge vorhanden.
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider py-3 px-4">
                Titel
              </th>
              <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider py-3 px-4">
                Schule
              </th>
              <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider py-3 px-4">
                Status
              </th>
              <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider py-3 px-4">
                Datum
              </th>
              <th className="text-right text-xs font-semibold text-text-light uppercase tracking-wider py-3 px-4">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody>
            {practices.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="py-4 px-4 text-sm font-medium text-text">
                  {p.title}
                </td>
                <td className="py-4 px-4 text-sm text-text-light">
                  {p.school_name}
                </td>
                <td className="py-4 px-4">
                  {p.published ? (
                    <span className="inline-flex bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">
                      Veröffentlicht
                    </span>
                  ) : (
                    <span className="inline-flex bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full">
                      Entwurf
                    </span>
                  )}
                </td>
                <td className="py-4 px-4 text-sm text-text-light">
                  {new Date(p.created_at).toLocaleDateString("de-DE")}
                </td>
                <td className="py-4 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/best-practice/admin/${p.id}/bearbeiten`}
                      className="inline-flex items-center gap-1 text-sm text-primary-light hover:text-primary transition-colors"
                    >
                      <Pencil className="w-4 h-4" aria-hidden="true" />
                      Bearbeiten
                    </Link>
                    <button
                      onClick={() => handleDelete(p.id, p.title)}
                      className="inline-flex items-center gap-1 text-sm text-red-500 hover:text-red-700 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                      Löschen
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {practices.map((p) => (
          <div
            key={p.id}
            className="bg-white rounded-xl p-4 shadow-sm border border-border"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="text-sm font-semibold text-text">{p.title}</h3>
              {p.published ? (
                <span className="inline-flex bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full flex-shrink-0">
                  Veröffentlicht
                </span>
              ) : (
                <span className="inline-flex bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full flex-shrink-0">
                  Entwurf
                </span>
              )}
            </div>
            <p className="text-xs text-text-light mb-3">
              {p.school_name} &middot;{" "}
              {new Date(p.created_at).toLocaleDateString("de-DE")}
            </p>
            <div className="flex gap-4">
              <Link
                href={`/best-practice/admin/${p.id}/bearbeiten`}
                className="inline-flex items-center gap-1 text-sm text-primary-light hover:text-primary"
              >
                <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                Bearbeiten
              </Link>
              <button
                onClick={() => handleDelete(p.id, p.title)}
                className="inline-flex items-center gap-1 text-sm text-red-500 hover:text-red-700"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                Löschen
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
