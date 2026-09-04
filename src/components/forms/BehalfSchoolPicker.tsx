"use client";

import { CheckCircle2, RefreshCw, Search, UserCog } from "lucide-react";
import type { useBehalfSchool } from "./useBehalfSchool";

/**
 * UI des Stellvertreter-Modus im Abschnitt „Wer beantragt?": Hinweis-Banner,
 * Schulauswahl mit Suche bzw. Chip der gewählten Schule. Die Logik liefert
 * `useBehalfSchool`; diese Komponente rendert nur.
 */
export default function BehalfSchoolPicker({
  behalf,
  roleLabel,
  inputClass,
}: {
  behalf: ReturnType<typeof useBehalfSchool>;
  roleLabel: string;
  inputClass: string;
}) {
  return (
    <>
      <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary-light/10 p-4">
        <span
          aria-hidden="true"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
        >
          <UserCog className="h-4 w-4" />
        </span>
        <p className="text-sm leading-relaxed text-text">
          <strong className="font-bold">Stellvertreter-Modus:</strong> Sie
          füllen diesen Antrag als{" "}
          <strong className="font-semibold">{roleLabel}</strong> für eine
          Schule aus. Der Antrag wird entsprechend gekennzeichnet.
        </p>
      </div>

      {behalf.selected ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
          <div className="flex items-center gap-3">
            <CheckCircle2
              className="h-5 w-5 shrink-0 text-green-700"
              aria-hidden="true"
            />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-green-800">
                Gewählte Schule
              </p>
              <p className="text-sm font-semibold text-green-900">
                {behalf.selected.name}
                {(behalf.selected.plz || behalf.selected.city) && (
                  <span className="ml-2 font-normal text-green-800">
                    {[behalf.selected.plz, behalf.selected.city]
                      .filter(Boolean)
                      .join(" ")}
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={behalf.reset}
            className="text-sm font-semibold text-green-800 underline underline-offset-2 hover:text-green-900"
          >
            Andere Schule wählen
          </button>
        </div>
      ) : (
        <div>
          <label
            htmlFor="behalf_school_search"
            className="mb-1.5 block text-sm font-medium text-text"
          >
            Schule auswählen *
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-light"
              aria-hidden="true"
            />
            <input
              id="behalf_school_search"
              type="text"
              autoComplete="off"
              value={behalf.search}
              onChange={(e) => behalf.setSearch(e.target.value)}
              className={inputClass + " pl-11"}
              placeholder="Schulname eingeben, z.B. Eversburg …"
            />
          </div>
          {behalf.schoolsLoading ? (
            <p className="mt-2 flex items-center gap-2 text-sm text-text-light">
              <RefreshCw
                className="h-3.5 w-3.5 animate-spin"
                aria-hidden="true"
              />
              Verifizierte Schulliste wird geladen …
            </p>
          ) : (
            <>
              <ul className="mt-2 max-h-64 divide-y divide-border overflow-y-auto rounded-lg border border-border bg-white shadow-sm">
                {behalf.shown.map((s) => (
                  <li key={s.name}>
                    <button
                      type="button"
                      onClick={() => behalf.choose(s)}
                      className="w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-primary/5"
                    >
                      <span className="font-medium text-text">{s.name}</span>
                      {(s.plz || s.city) && (
                        <span className="mt-0.5 block text-xs text-text-light">
                          {[s.plz, s.city].filter(Boolean).join(" ")}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
                {behalf.shown.length === 0 && (
                  <li className="px-4 py-3 text-sm text-text-light">
                    Keine Schule gefunden – prüfen Sie die Schreibweise.
                    Gelistet sind alle bei DigiKI angemeldeten Schulen
                    (Bestandsaufnahme) sowie die Schulen aus dem
                    Schulungsdashboard.
                  </li>
                )}
              </ul>
              {behalf.matches.length > behalf.shown.length && (
                <p className="mt-1.5 text-xs text-text-light">
                  {behalf.shown.length} von {behalf.matches.length} Schulen
                  angezeigt – tippen Sie, um die Liste einzugrenzen.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
