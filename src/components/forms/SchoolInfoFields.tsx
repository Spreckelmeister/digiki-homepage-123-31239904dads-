"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ChevronDown,
  MapPin,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import LockedFieldDisplay from "./LockedFieldDisplay";
import {
  useAddressAutocomplete,
  type AddressSuggestion,
} from "./useAddressAutocomplete";
import {
  useSchoolAutocomplete,
  type SchoolSuggestion,
} from "./useSchoolAutocomplete";
import { usePlzCityLookup } from "./usePlzCityLookup";

interface SchoolInfoFieldsProps {
  values: {
    school_name: string;
    school_street: string;
    school_plz: string;
    school_city: string;
    principal_name: string;
    contact_person: string;
    phone: string;
    email: string;
    teacher_count: string;
    student_count: string;
  };
  onChange: (field: string, value: string) => void;
  inputClass: string;
  /** Wenn gesetzt, wird das E-Mail-Feld als gesperrte Anzeige gerendert –
   *  der Wert kommt aus dem angemeldeten Account. */
  lockedEmail?: string;
  /** Liste der Felder, die als gesperrte Anzeige (Quelle:
   *  Bestandsaufnahme) gerendert werden sollen. */
  lockedFromBestandsaufnahme?: string[];
  /** „Weich bekannte" Felder: vor-ausgefüllt aus Bestandsaufnahme, letztem
   *  Antrag oder Schulungsdashboard, in der Zusammenfassung gezeigt und erst
   *  auf Klick („Korrigieren") wieder als Eingabefeld geöffnet. */
  softPrefilled?: Array<{
    field: string;
    source: "bsa" | "antrag" | "dashboard";
  }>;
  /** Reine ANZEIGE-Zeilen für die Zusammenfassung (z. B. das Schülerzahl-
   *  Band aus der Bestandsaufnahme, das nicht in ein Zahlenfeld passt).
   *  `hidesField` blendet zusätzlich das zugehörige Eingabefeld aus. */
  extraSummaryRows?: Array<{
    key: string;
    label: string;
    value: string;
    source: "bsa" | "antrag" | "dashboard";
    hidesField?: string;
  }>;
  /** Stellvertreter-Modus: Der Schulname kommt aus der Schulauswahl darüber
   *  und wird hier nicht noch einmal als Feld angezeigt. */
  hideSchoolName?: boolean;
  /** Stellvertreter-Modus: Die Daten gehören der GEWÄHLTEN Schule, nicht dem
   *  angemeldeten Konto – Beschriftungen und Links passen sich an. */
  foreignSchool?: boolean;
  /** Stellvertreter-Modus: lädt die übernommenen Werte frisch aus der
   *  Bestandsaufnahme der Schule (BSA-Werte sind hier bewusst nicht direkt
   *  änderbar – gepflegt wird an der Quelle). */
  onForeignRefresh?: () => void;
  /** Ersetzt den Standard-Tipp unter dem (ungesperrten) E-Mail-Feld. */
  emailHint?: React.ReactNode;
}

export default function SchoolInfoFields({
  values,
  onChange,
  inputClass,
  lockedEmail,
  lockedFromBestandsaufnahme = [],
  softPrefilled = [],
  extraSummaryRows = [],
  hideSchoolName = false,
  foreignSchool = false,
  onForeignRefresh,
  emailHint,
}: SchoolInfoFieldsProps) {
  // School name autocomplete
  const {
    suggestions: schoolSuggestions,
    isLoading: schoolLoading,
    clearSuggestions: clearSchoolSuggestions,
  } = useSchoolAutocomplete(values.school_name);
  const [showSchoolSuggestions, setShowSchoolSuggestions] = useState(false);
  const schoolBlurRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Address autocomplete
  const {
    suggestions: addressSuggestions,
    isLoading: addressLoading,
    clearSuggestions: clearAddressSuggestions,
  } = useAddressAutocomplete(values.school_street);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const addressBlurRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const isEmailLocked = Boolean(lockedEmail);
  // Lock nur dann anzeigen, wenn das Feld AUCH einen Wert hat. Sollte
  // sich aus irgendeinem Grund (Race-Condition, stale Cache, leere BSA)
  // ein gelocktes Feld ohne Wert ergeben, fallen wir auf das normale
  // editierbare Input zurück, damit der Nutzer nicht festhängt.
  const hasValue = (field: keyof typeof values) => {
    const v = values[field];
    return typeof v === "string" && v.trim().length > 0;
  };
  const isBSALocked = (field: keyof typeof values) =>
    lockedFromBestandsaufnahme.includes(field) && hasValue(field);
  const anyBSALocked =
    lockedFromBestandsaufnahme.length > 0 &&
    lockedFromBestandsaufnahme.some((f) =>
      hasValue(f as keyof typeof values),
    );

  // ── Zusammenfassung statt Formular ────────────────────────────────────────
  // Bekannte Werte erscheinen NICHT mehr als (gesperrte) Formularfelder,
  // sondern gebündelt in einer Karte – Eingabefelder gibt es nur noch für
  // das, was wirklich fehlt. „Weich bekannte" Werte (softPrefilled) lassen
  // sich per „Korrigieren" wieder zu Feldern aufklappen; BSA-gesperrte
  // Werte werden ausschließlich über die Bestandsaufnahme gepflegt.
  const [editedSoft, setEditedSoft] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const markEdited = (...fields: string[]) =>
    setEditedSoft((prev) => new Set([...prev, ...fields]));

  const softSourceByField = new Map(
    softPrefilled.map((s) => [s.field, s.source]),
  );
  const softKnown = (field: keyof typeof values): boolean =>
    softSourceByField.has(field) && hasValue(field) && !editedSoft.has(field);

  // Adresse nur als Ganzes zusammenfassen – eine halbe Adresse bleibt Feld.
  const addressKnown =
    softKnown("school_street") &&
    softKnown("school_plz") &&
    softKnown("school_city");
  const singleSoftFields = [
    "principal_name",
    "contact_person",
    "phone",
    "email",
    "teacher_count",
    "student_count",
  ] as const;
  const anySoftKnown =
    addressKnown || singleSoftFields.some((f) => softKnown(f));
  const summaryActive =
    anyBSALocked || anySoftKnown || extraSummaryRows.length > 0;

  // Felder, die durch reine Anzeige-Zeilen ersetzt werden (z. B. das
  // Schülerzahl-Band aus der BSA statt des Zahlenfelds).
  const extraHidden = new Set(
    extraSummaryRows.flatMap((r) => (r.hidesField ? [r.hidesField] : [])),
  );

  const showSchoolNameInput = !isBSALocked("school_name") && !hideSchoolName;
  const showAddressInputs = !addressKnown;
  const showPrincipalInput =
    !isBSALocked("principal_name") && !softKnown("principal_name");
  const showContactInput =
    !isBSALocked("contact_person") && !softKnown("contact_person");
  const showPhoneInput = !isBSALocked("phone") && !softKnown("phone");
  // Gesperrte E-Mail: mit Karte → Zeile in der Karte; ohne Karte → wie bisher
  // als eigene gesperrte Anzeige. Weich bekannt (Stellvertreter-Modus) →
  // ebenfalls Karte. Sonst normales Feld.
  const showEmailField =
    !(summaryActive && isEmailLocked) && !softKnown("email");
  const showTeacherInput =
    !isBSALocked("teacher_count") &&
    !softKnown("teacher_count") &&
    !extraHidden.has("teacher_count");
  const showStudentInput =
    !softKnown("student_count") && !extraHidden.has("student_count");
  const anyInputBelow =
    showSchoolNameInput ||
    showAddressInputs ||
    showPrincipalInput ||
    showContactInput ||
    showPhoneInput ||
    showEmailField ||
    showTeacherInput ||
    showStudentInput;

  type SummarySource = "bsa" | "konto" | "antrag" | "dashboard";
  const summaryRows: Array<{
    key: string;
    label: string;
    value: string;
    source: SummarySource;
    mono?: boolean;
    onEdit?: () => void;
    editLabel?: string;
  }> = [];
  if (summaryActive) {
    const pushLockedOrSoft = (
      field: (typeof singleSoftFields)[number] | "school_name",
      label: string,
      opts: { mono?: boolean } = {},
    ) => {
      if (isBSALocked(field)) {
        summaryRows.push({
          key: field,
          label,
          value: values[field],
          source: "bsa",
          ...opts,
        });
      } else if (field !== "school_name" && softKnown(field)) {
        summaryRows.push({
          key: field,
          label,
          value: values[field],
          source: softSourceByField.get(field) ?? "bsa",
          onEdit: () => markEdited(field),
          editLabel: "Korrigieren",
          ...opts,
        });
      }
    };

    pushLockedOrSoft("school_name", "Name der Schule");
    if (addressKnown) {
      summaryRows.push({
        key: "address",
        label: "Adresse",
        value: `${values.school_street.trim()}, ${values.school_plz.trim()} ${values.school_city.trim()}`,
        source: softSourceByField.get("school_street") ?? "antrag",
        onEdit: () =>
          markEdited("school_street", "school_plz", "school_city"),
        editLabel: "Adresse korrigieren",
      });
    }
    pushLockedOrSoft("principal_name", "Schulleitung");
    pushLockedOrSoft("contact_person", "Ansprechperson");
    pushLockedOrSoft("phone", "Telefon");
    if (isEmailLocked) {
      summaryRows.push({
        key: "email",
        label: "E-Mail",
        value: values.email,
        source: "konto",
        mono: true,
      });
    } else {
      pushLockedOrSoft("email", "E-Mail", { mono: true });
    }
    pushLockedOrSoft("teacher_count", "Anzahl Lehrkräfte");
    pushLockedOrSoft("student_count", "Anzahl Schüler/innen");
    for (const row of extraSummaryRows) {
      summaryRows.push({
        key: row.key,
        label: row.label,
        value: row.value,
        source: row.source,
      });
    }
  }

  const SOURCE_META: Record<
    SummarySource,
    { label: string; dotClass: string }
  > = {
    bsa: {
      label: foreignSchool
        ? "aus der Bestandsaufnahme der Schule"
        : "aus Ihrer Bestandsaufnahme",
      dotClass: "bg-primary",
    },
    konto: { label: "aus Ihrem Konto", dotClass: "bg-emerald-500" },
    dashboard: {
      label: "aus dem Schulungsdashboard",
      dotClass: "bg-sky-500",
    },
    antrag: {
      label: foreignSchool
        ? "aus dem letzten Antrag der Schule"
        : "aus Ihrem letzten Antrag",
      dotClass: "bg-accent-strong",
    },
  };
  const usedSources = Array.from(
    new Set(summaryRows.map((r) => r.source)),
  ) as SummarySource[];

  function handleSelectSchool(suggestion: SchoolSuggestion) {
    onChange("school_name", suggestion.name);
    if (suggestion.street) onChange("school_street", suggestion.street);
    if (suggestion.plz) onChange("school_plz", suggestion.plz);
    if (suggestion.city) onChange("school_city", suggestion.city);
    clearSchoolSuggestions();
    setShowSchoolSuggestions(false);
  }

  function handleSelectAddress(suggestion: AddressSuggestion) {
    onChange("school_street", suggestion.street);
    onChange("school_plz", suggestion.plz);
    onChange("school_city", suggestion.city);
    clearAddressSuggestions();
    setShowAddressSuggestions(false);
  }

  // ── Auto-Vorschlag für die Schul-Adresse ──────────────────────────────────
  // Wenn der Schulname schon feststeht (z.B. weil er aus der Bestandsaufnahme
  // gesperrt übernommen wurde) und die Adresse noch leer ist, fragen wir
  // Nominatim einmalig nach der Schule und schlagen die gefundene Adresse vor.
  // Der Nutzer kann den Vorschlag manuell editieren oder eine Alternative wählen.
  const addressEmpty =
    !values.school_street.trim() &&
    !values.school_plz.trim() &&
    !values.school_city.trim();
  const {
    suggestions: schoolMatches,
    isLoading: schoolMatchesLoading,
  } = useSchoolAutocomplete(
    addressEmpty && values.school_name.trim().length >= 3
      ? values.school_name
      : "",
  );
  const validSchoolMatches = schoolMatches.filter(
    (s) => s.street && s.plz && s.city,
  );
  const [autoSuggestedAddress, setAutoSuggestedAddress] = useState<{
    street: string;
    plz: string;
    city: string;
  } | null>(null);
  const [showAddressAlternatives, setShowAddressAlternatives] = useState(false);

  useEffect(() => {
    if (autoSuggestedAddress) return;
    if (!addressEmpty) return;
    if (validSchoolMatches.length === 0) return;
    const top = validSchoolMatches[0];
    onChange("school_street", top.street);
    onChange("school_plz", top.plz);
    onChange("school_city", top.city);
    setAutoSuggestedAddress({
      street: top.street,
      plz: top.plz,
      city: top.city,
    });
    // onChange ändert sich mit jedem Render – wäre ein Endlos-Loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validSchoolMatches, addressEmpty, autoSuggestedAddress]);

  // Vorschlags-Badge nur zeigen, solange die Felder dem Vorschlag entsprechen.
  // Sobald der Nutzer manuell editiert, blenden wir den Hinweis aus.
  const addressMatchesSuggestion =
    autoSuggestedAddress !== null &&
    values.school_street.trim() === autoSuggestedAddress.street &&
    values.school_plz.trim() === autoSuggestedAddress.plz &&
    values.school_city.trim() === autoSuggestedAddress.city;

  function applyAlternativeAddress(s: SchoolSuggestion) {
    onChange("school_street", s.street);
    onChange("school_plz", s.plz);
    onChange("school_city", s.city);
    setAutoSuggestedAddress({ street: s.street, plz: s.plz, city: s.city });
    setShowAddressAlternatives(false);
  }

  // ── PLZ → Ort-Auto-Ergänzung ───────────────────────────────────────────────
  // Fallback, falls die Nominatim-Schul-Suche oben nichts gefunden hat:
  // sobald der Nutzer eine 5-stellige PLZ eingibt UND der Ort leer ist,
  // ergänzen wir den Ort automatisch via Nominatim. Sobald der Nutzer den
  // Ort selbst tippt, fassen wir ihn nicht mehr an.
  const { city: plzResolvedCity } = usePlzCityLookup(values.school_plz);
  useEffect(() => {
    if (!plzResolvedCity) return;
    if (values.school_city.trim().length > 0) return;
    onChange("school_city", plzResolvedCity);
    // onChange ist eine neue Referenz pro Render – nicht in die Deps aufnehmen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plzResolvedCity]);

  // ── Straße → PLZ + Ort-Auto-Ergänzung ──────────────────────────────────────
  // Sobald der Nutzer eine Straße tippt und der Autocomplete liefert
  // einen Top-Treffer mit PLZ und Ort, übernehmen wir beides automatisch –
  // aber NUR, wenn diese Felder noch leer sind. So bleibt eine vorhandene
  // (z.B. aus dem Schulnamen vorausgefüllte) Adresse unangetastet.
  // Die Suggestions kommen aus `useAddressAutocomplete(values.school_street)`
  // (oben bereits aktiv).
  useEffect(() => {
    if (values.school_plz.trim().length > 0) return;
    if (values.school_city.trim().length > 0) return;
    if (values.school_street.trim().length < 5) return;
    const first = addressSuggestions.find((s) => s.plz && s.city);
    if (!first) return;
    onChange("school_plz", first.plz);
    onChange("school_city", first.city);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressSuggestions]);

  return (
    <div className="space-y-4">
      {/* Zusammenfassung aller bereits bekannten Angaben – ersetzt die
          früheren gesperrten Einzelfelder. */}
      {summaryActive && (
        <div className="overflow-hidden rounded-xl border border-primary/15 bg-gradient-to-br from-bg to-primary-light/[0.06] shadow-sm">
          <div className="px-5 pt-4">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Schon für Sie ausgefüllt
            </p>
            <p className="mt-1.5 max-w-[70ch] text-[13.5px] leading-relaxed text-text-light">
              {anyInputBelow
                ? foreignSchool
                  ? "Diese Angaben zur gewählten Schule liegen bereits vor – ergänzen Sie unten nur noch die fehlenden Felder."
                  : "Diese Angaben liegen uns bereits vor – ergänzen Sie unten nur noch die fehlenden Felder."
                : foreignSchool
                  ? "Alle Angaben zur gewählten Schule liegen bereits vor – in diesem Abschnitt gibt es nichts auszufüllen."
                  : "Alle Angaben zu Ihrer Schule liegen uns bereits vor – in diesem Abschnitt gibt es nichts auszufüllen."}{" "}
              {foreignSchool ? (
                <>
                  Prüfen Sie kurz, ob alles aktuell ist – über „Korrigieren"
                  lässt sich jeder Wert anpassen, und „Aus Bestandsaufnahme
                  aktualisieren" lädt die Werte neu.
                </>
              ) : usedSources.includes("bsa") ? (
                <>
                  Änderungen (z.&nbsp;B. neue Schulleitung) pflegen Sie zentral
                  in Ihrer Bestandsaufnahme – von dort übernehmen wir sie
                  automatisch.
                </>
              ) : (
                <>
                  Über „Korrigieren" öffnen Sie einzelne Angaben wieder zum
                  Bearbeiten.
                </>
              )}
            </p>
          </div>
          <dl className="grid grid-cols-1 gap-x-8 gap-y-3.5 px-5 py-4 sm:grid-cols-2">
            {summaryRows.map((row) => (
              <div key={row.key} className="min-w-0">
                <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-light">
                  <span
                    aria-hidden="true"
                    className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${SOURCE_META[row.source].dotClass}`}
                  />
                  {row.label}
                  <span className="sr-only">
                    {" "}
                    ({SOURCE_META[row.source].label})
                  </span>
                </dt>
                <dd className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span
                    className={`break-words text-[15px] font-semibold leading-snug text-text ${
                      row.mono ? "font-mono text-[13.5px]" : ""
                    }`}
                  >
                    {row.value}
                  </span>
                  {row.onEdit && (
                    <button
                      type="button"
                      onClick={row.onEdit}
                      aria-label={`${row.label} korrigieren`}
                      className="shrink-0 text-[12px] font-semibold text-primary underline underline-offset-2 transition-colors hover:text-primary/80"
                    >
                      {row.editLabel ?? "Korrigieren"}
                    </button>
                  )}
                </dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-primary/10 bg-white/60 px-5 py-2.5">
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-text-light">
              {usedSources.map((s) => (
                <span key={s} className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className={`inline-block h-1.5 w-1.5 rounded-full ${SOURCE_META[s].dotClass}`}
                  />
                  {SOURCE_META[s].label}
                </span>
              ))}
            </p>
            {foreignSchool && onForeignRefresh && (
              <button
                type="button"
                onClick={onForeignRefresh}
                className="inline-flex items-center gap-1.5 rounded-md border border-primary/25 bg-white px-2.5 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/5"
              >
                <RefreshCw className="h-3 w-3" aria-hidden="true" />
                Aus Bestandsaufnahme aktualisieren
              </button>
            )}
            {!foreignSchool && (
              <span className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                {isEmailLocked && (
                  <Link
                    href="/best-practice/konto"
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-text-light transition-colors hover:text-primary"
                  >
                    Konto-Einstellungen
                    <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                  </Link>
                )}
                {usedSources.includes("bsa") && (
                  <Link
                    href="/best-practice/meine-bestandsaufnahme/bearbeiten"
                    className="inline-flex items-center gap-1.5 rounded-md border border-primary/25 bg-white px-2.5 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/5"
                  >
                    <RefreshCw className="h-3 w-3" aria-hidden="true" />
                    Bestandsaufnahme aktualisieren
                  </Link>
                )}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Zwischenüberschrift, wenn unter der Karte noch Felder offen sind */}
      {summaryActive && anyInputBelow && (
        <p className="pt-1 text-[11px] font-bold uppercase tracking-[0.22em] text-text-light">
          Bitte noch ergänzen
        </p>
      )}

      {/* Schulname */}
      {showSchoolNameInput && (
        <div className="relative">
          <label
            htmlFor="school_name"
            className="block text-sm font-medium text-text mb-1.5"
          >
            Name der Schule *
          </label>
          <input
            id="school_name"
            type="text"
            required
            autoComplete="off"
            value={values.school_name}
            onChange={(e) => {
              onChange("school_name", e.target.value);
              setShowSchoolSuggestions(true);
            }}
            onFocus={() => setShowSchoolSuggestions(true)}
            onBlur={() => {
              schoolBlurRef.current = setTimeout(
                () => setShowSchoolSuggestions(false),
                200,
              );
            }}
            className={inputClass}
            placeholder="z.B. Grundschule Eversburg"
          />
          {showSchoolSuggestions && schoolSuggestions.length > 0 && (
            <ul className="absolute z-10 w-full mt-1 bg-white border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {schoolSuggestions.map((s, i) => (
                <li key={i}>
                  <button
                    type="button"
                    className="w-full text-left px-4 py-2 text-sm hover:bg-primary/5 transition-colors"
                    onMouseDown={() => {
                      if (schoolBlurRef.current)
                        clearTimeout(schoolBlurRef.current);
                    }}
                    onClick={() => handleSelectSchool(s)}
                  >
                    <span className="font-medium">{s.name}</span>
                    <span className="text-text-light block text-xs mt-0.5">
                      {[s.street, s.plz, s.city].filter(Boolean).join(", ")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {schoolLoading && showSchoolSuggestions && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-border rounded-lg shadow-lg px-4 py-2 text-sm text-text-light">
              Suche Schulen...
            </div>
          )}
        </div>
      )}

      {/* Auto-Adress-Vorschlag aus Nominatim, falls Schulname schon bekannt */}
      {showAddressInputs && (addressMatchesSuggestion || schoolMatchesLoading) && (
        <div className="rounded-lg border border-primary-light/30 bg-primary-light/5 px-4 py-3">
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"
            >
              <MapPin className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                {schoolMatchesLoading && !addressMatchesSuggestion
                  ? "Adresse wird gesucht…"
                  : "Adressvorschlag aus OpenStreetMap"}
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-text-light">
                Wir haben die Adresse anhand des Schulnamens automatisch ausgefüllt.
                Bitte <strong className="font-semibold text-text">kurz prüfen</strong> und
                bei Bedarf korrigieren.
              </p>
              {validSchoolMatches.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setShowAddressAlternatives((v) => !v)
                  }
                  className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:text-primary/80 transition-colors"
                  aria-expanded={showAddressAlternatives}
                >
                  <ChevronDown
                    className={`h-3 w-3 transition-transform ${
                      showAddressAlternatives ? "rotate-180" : ""
                    }`}
                    aria-hidden="true"
                  />
                  {showAddressAlternatives
                    ? "Alternativen ausblenden"
                    : `Andere Adresse wählen (${validSchoolMatches.length - 1} weitere)`}
                </button>
              )}
              {showAddressAlternatives && validSchoolMatches.length > 1 && (
                <ul className="mt-3 space-y-1.5">
                  {validSchoolMatches.map((s, i) => {
                    const isCurrent =
                      autoSuggestedAddress?.street === s.street &&
                      autoSuggestedAddress?.plz === s.plz &&
                      autoSuggestedAddress?.city === s.city;
                    return (
                      <li key={i}>
                        <button
                          type="button"
                          onClick={() => applyAlternativeAddress(s)}
                          disabled={isCurrent}
                          className={`w-full rounded-md border px-3 py-2 text-left text-[13px] transition-colors ${
                            isCurrent
                              ? "border-primary/40 bg-primary/5 text-primary cursor-default"
                              : "border-border bg-white hover:border-primary/40 hover:bg-primary-light/10"
                          }`}
                        >
                          <span className="block font-medium text-text">
                            {s.street}
                          </span>
                          <span className="block text-[12px] text-text-light">
                            {s.plz} {s.city}
                            {isCurrent && (
                              <span className="ml-2 text-primary">
                                (aktuell ausgewählt)
                              </span>
                            )}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Straße mit Autocomplete (nicht in der BSA; ausgeblendet nur, wenn
          die Adresse aus dem letzten Antrag übernommen wurde) */}
      {showAddressInputs && (
      <>
      <div className="relative">
        <label
          htmlFor="school_street"
          className="block text-sm font-medium text-text mb-1.5"
        >
          Straße und Hausnummer *
        </label>
        <input
          id="school_street"
          type="text"
          required
          autoComplete="off"
          value={values.school_street}
          onChange={(e) => {
            onChange("school_street", e.target.value);
            setShowAddressSuggestions(true);
          }}
          onFocus={() => setShowAddressSuggestions(true)}
          onBlur={() => {
            addressBlurRef.current = setTimeout(
              () => setShowAddressSuggestions(false),
              200,
            );
          }}
          className={inputClass}
          placeholder="z.B. Musterstraße 12"
        />
        {showAddressSuggestions && addressSuggestions.length > 0 && (
          <ul className="absolute z-10 w-full mt-1 bg-white border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {addressSuggestions.map((s, i) => (
              <li key={i}>
                <button
                  type="button"
                  className="w-full text-left px-4 py-2 text-sm hover:bg-primary/5 transition-colors"
                  onMouseDown={() => {
                    if (addressBlurRef.current)
                      clearTimeout(addressBlurRef.current);
                  }}
                  onClick={() => handleSelectAddress(s)}
                >
                  {s.display_name}
                </button>
              </li>
            ))}
          </ul>
        )}
        {addressLoading && showAddressSuggestions && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-border rounded-lg shadow-lg px-4 py-2 text-sm text-text-light">
            Suche...
          </div>
        )}
      </div>

      {/* PLZ + Ort */}
      <div className="grid grid-cols-[1fr_2fr] gap-4">
        <div>
          <label
            htmlFor="school_plz"
            className="block text-sm font-medium text-text mb-1.5"
          >
            PLZ *
          </label>
          <input
            id="school_plz"
            type="text"
            required
            inputMode="numeric"
            pattern="[0-9]{5}"
            maxLength={5}
            value={values.school_plz}
            onChange={(e) => onChange("school_plz", e.target.value)}
            className={inputClass}
            placeholder="49074"
          />
        </div>
        <div>
          <label
            htmlFor="school_city"
            className="block text-sm font-medium text-text mb-1.5"
          >
            Ort *
          </label>
          <input
            id="school_city"
            type="text"
            required
            value={values.school_city}
            onChange={(e) => onChange("school_city", e.target.value)}
            className={inputClass}
            placeholder="Osnabrück"
          />
        </div>
      </div>
      </>
      )}

      {/* Schulleitung + Ansprechperson */}
      {(showPrincipalInput || showContactInput) && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {showPrincipalInput && (
          <div>
            <label
              htmlFor="principal_name"
              className="block text-sm font-medium text-text mb-1.5"
            >
              Schulleitung *
            </label>
            <input
              id="principal_name"
              type="text"
              required
              value={values.principal_name}
              onChange={(e) => onChange("principal_name", e.target.value)}
              className={inputClass}
              placeholder="Vor- und Nachname"
            />
          </div>
        )}

        {showContactInput && (
          <div>
            <label
              htmlFor="contact_person"
              className="block text-sm font-medium text-text mb-1.5"
            >
              Ansprechperson (Name, Funktion) *
            </label>
            <input
              id="contact_person"
              type="text"
              required
              value={values.contact_person}
              onChange={(e) => onChange("contact_person", e.target.value)}
              className={inputClass}
              placeholder="Name, Funktion"
            />
          </div>
        )}
      </div>
      )}

      {/* Telefon + Email */}
      {(showPhoneInput || showEmailField) && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {showPhoneInput && (
          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-text mb-1.5"
            >
              Telefon *
            </label>
            <input
              id="phone"
              type="tel"
              required
              value={values.phone}
              onChange={(e) => onChange("phone", e.target.value)}
              className={inputClass}
              placeholder="0541 / ..."
            />
          </div>
        )}

        {showEmailField && (isEmailLocked ? (
          <LockedFieldDisplay
            htmlFor="email"
            label="E-Mail *"
            value={values.email}
            source="konto"
            mono
          />
        ) : (
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-text mb-1.5"
            >
              E-Mail *
            </label>
            <input
              id="email"
              type="email"
              required
              value={values.email}
              onChange={(e) => onChange("email", e.target.value)}
              className={inputClass}
              placeholder="schule@example.de"
            />
            <p className="mt-1.5 text-xs text-text-light">
              {emailHint ?? (
                <>
                  Tipp: Verwenden Sie dieselbe E-Mail wie Ihr Konto in der{" "}
                  <a
                    href="/best-practice/datenbank"
                    className="underline underline-offset-2 hover:text-primary transition-colors"
                  >
                    Best-Practice-Datenbank
                  </a>
                  , um dort den vollständigen Bearbeitungsstatus einsehen zu
                  können.
                </>
              )}
            </p>
          </div>
        ))}
      </div>
      )}

      {/* Lehrkraft- + Schülerzahl */}
      {(showTeacherInput || showStudentInput) && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {showTeacherInput && (
          <div>
            <label
              htmlFor="teacher_count"
              className="block text-sm font-medium text-text mb-1.5"
            >
              Anzahl Lehrkräfte
            </label>
            <input
              id="teacher_count"
              type="number"
              min="0"
              value={values.teacher_count}
              onChange={(e) => onChange("teacher_count", e.target.value)}
              className={inputClass}
            />
          </div>
        )}
        {showStudentInput && (
          <div>
            <label
              htmlFor="student_count"
              className="block text-sm font-medium text-text mb-1.5"
            >
              Anzahl Schüler/innen
            </label>
            <input
              id="student_count"
              type="number"
              min="0"
              value={values.student_count}
              onChange={(e) => onChange("student_count", e.target.value)}
              className={inputClass}
            />
          </div>
        )}
      </div>
      )}
    </div>
  );
}
