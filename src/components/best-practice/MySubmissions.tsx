"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, FileText, Users, Wrench, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { ApplicationStatus } from "@/lib/types";

interface BestPracticeResult {
  id: string;
  title: string;
  school_name: string;
  published: boolean;
  created_at: string;
}

interface ApplicationResult {
  id: string;
  school_name: string;
  status: ApplicationStatus;
  created_at: string;
}

interface SubmissionsResult {
  best_practices: BestPracticeResult[];
  student_apps: ApplicationResult[];
  tool_apps: ApplicationResult[];
}

const APP_STATUS_CONFIG: Record<ApplicationStatus, { label: string; className: string }> = {
  neu:           { label: "Neu – wird geprüft",   className: "bg-yellow-100 text-yellow-700" },
  in_bearbeitung:{ label: "In Bearbeitung",        className: "bg-blue-100   text-blue-700"   },
  genehmigt:     { label: "Genehmigt",             className: "bg-green-100  text-green-700"  },
  abgelehnt:     { label: "Abgelehnt",             className: "bg-red-100    text-red-700"    },
};

function StatusBadge({ status }: { status: ApplicationStatus }) {
  const cfg = APP_STATUS_CONFIG[status] ?? APP_STATUS_CONFIG.neu;
  return (
    <span className={`inline-flex text-xs px-2.5 py-0.5 rounded-full font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

function PublishedBadge({ published }: { published: boolean }) {
  return published ? (
    <span className="inline-flex text-xs px-2.5 py-0.5 rounded-full font-medium bg-green-100 text-green-700">
      Veröffentlicht
    </span>
  ) : (
    <span className="inline-flex text-xs px-2.5 py-0.5 rounded-full font-medium bg-yellow-100 text-yellow-700">
      Eingereicht – wird geprüft
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function MySubmissions() {
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [results, setResults] = useState<SubmissionsResult | null>(null);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setError("Bitte geben Sie eine gültige E-Mail-Adresse ein.");
      return;
    }
    setError("");
    setLoading(true);
    setResults(null);

    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc(
      "get_submissions_by_email",
      { search_email: trimmed }
    );

    setLoading(false);
    setSearched(true);

    if (rpcError) {
      setError("Fehler bei der Abfrage. Bitte versuchen Sie es erneut.");
      return;
    }

    setResults(data as SubmissionsResult);
  }

  const totalCount =
    (results?.best_practices.length ?? 0) +
    (results?.student_apps.length ?? 0) +
    (results?.tool_apps.length ?? 0);

  return (
    <div className="mt-16 border-t border-border pt-12">
      <div className="flex items-center gap-3 mb-2">
        <Search className="w-5 h-5 text-primary" aria-hidden="true" />
        <h2 className="text-2xl font-bold text-primary">Meine Einreichungen</h2>
      </div>
      <p className="text-text-light mb-6 max-w-2xl">
        Geben Sie die E-Mail-Adresse ein, die Sie beim Einreichen verwendet haben,
        um den aktuellen Status Ihrer Anträge und Best-Practice-Beiträge zu sehen.
      </p>

      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 max-w-lg mb-8">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ihre@schule.de"
          required
          className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-colors"
          aria-label="E-Mail-Adresse für Statusabfrage"
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          <Search className="w-4 h-4" aria-hidden="true" />
          {loading ? "Suche …" : "Status abfragen"}
        </button>
      </form>

      {error && (
        <p className="text-sm text-red-600 mb-4">{error}</p>
      )}

      {searched && results && totalCount === 0 && (
        <div className="bg-bg rounded-xl p-6 text-center text-text-light text-sm border border-border">
          Keine Einreichungen für diese E-Mail-Adresse gefunden.
        </div>
      )}

      {results && totalCount > 0 && (
        <div className="space-y-8">
          {/* Best-Practice-Beiträge */}
          {results.best_practices.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-primary" aria-hidden="true" />
                <h3 className="text-base font-semibold text-primary">
                  Best-Practice-Beiträge ({results.best_practices.length})
                </h3>
              </div>
              <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                {results.best_practices.map((bp) => (
                  <div key={bp.id} className="bg-white px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <p className="font-medium text-text text-sm">{bp.title}</p>
                      <p className="text-xs text-text-light mt-0.5">
                        {bp.school_name} · Eingereicht am {formatDate(bp.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <PublishedBadge published={bp.published} />
                      {bp.published && (
                        <Link
                          href={`/best-practice/datenbank/${bp.id}`}
                          className="inline-flex items-center gap-1 text-xs text-primary-light hover:text-primary transition-colors"
                        >
                          Ansehen
                          <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Anträge: Studentische Hilfskräfte */}
          {results.student_apps.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-primary" aria-hidden="true" />
                <h3 className="text-base font-semibold text-primary">
                  Anträge: Studentische Hilfskräfte ({results.student_apps.length})
                </h3>
              </div>
              <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                {results.student_apps.map((app) => (
                  <div key={app.id} className="bg-white px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <p className="font-medium text-text text-sm">{app.school_name}</p>
                      <p className="text-xs text-text-light mt-0.5">
                        Eingereicht am {formatDate(app.created_at)}
                      </p>
                    </div>
                    <StatusBadge status={app.status} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Anträge: Tool-Lizenzen */}
          {results.tool_apps.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Wrench className="w-4 h-4 text-primary" aria-hidden="true" />
                <h3 className="text-base font-semibold text-primary">
                  Anträge: Tool-Lizenzen ({results.tool_apps.length})
                </h3>
              </div>
              <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                {results.tool_apps.map((app) => (
                  <div key={app.id} className="bg-white px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <p className="font-medium text-text text-sm">{app.school_name}</p>
                      <p className="text-xs text-text-light mt-0.5">
                        Eingereicht am {formatDate(app.created_at)}
                      </p>
                    </div>
                    <StatusBadge status={app.status} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
