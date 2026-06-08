"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Info, MapPin, ChevronDown } from "lucide-react";
import LockedFieldDisplay from "./LockedFieldDisplay";
import {
  useAddressAutocomplete,
  type AddressSuggestion,
} from "./useAddressAutocomplete";
import {
  useSchoolAutocomplete,
  type SchoolSuggestion,
} from "./useSchoolAutocomplete";

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
}

export default function SchoolInfoFields({
  values,
  onChange,
  inputClass,
  lockedEmail,
  lockedFromBestandsaufnahme = [],
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

  return (
    <div className="space-y-4">
      {/* Prefill-Hinweis, wenn etwas aus der Bestandsaufnahme übernommen wurde */}
      {anyBSALocked && (
        <div className="flex items-start gap-4 rounded-xl border border-primary-light/30 bg-primary-light/5 p-5">
          <span
            aria-hidden="true"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
          >
            <Info className="h-4 w-4" />
          </span>
          <div className="flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
              Aus Ihrer Bestandsaufnahme übernommen
            </p>
            <p className="mt-2 text-[14px] leading-relaxed text-text-light">
              Felder mit „Aus Bestandsaufnahme" sind gesperrt, damit Ihre
              Angaben über alle Einreichungen konsistent bleiben. Änderungen
              (z.&nbsp;B. neue Schulleitung) können Sie jederzeit selbst in
              Ihrer{" "}
              <Link
                href="/best-practice/meine-bestandsaufnahme/bearbeiten"
                className="font-semibold text-primary underline underline-offset-2 hover:text-primary/80"
              >
                Bestandsaufnahme aktualisieren
              </Link>
              &nbsp;– von dort werden die Werte hier automatisch übernommen.
            </p>
          </div>
        </div>
      )}

      {/* Schulname */}
      {isBSALocked("school_name") ? (
        <LockedFieldDisplay
          htmlFor="school_name"
          label="Name der Schule *"
          value={values.school_name}
          source="bestandsaufnahme"
        />
      ) : (
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
      {(addressMatchesSuggestion || schoolMatchesLoading) && (
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

      {/* Straße mit Autocomplete (NICHT in BSA, immer editierbar) */}
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

      {/* Schulleitung + Ansprechperson */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isBSALocked("principal_name") ? (
          <LockedFieldDisplay
            htmlFor="principal_name"
            label="Schulleitung *"
            value={values.principal_name}
            source="bestandsaufnahme"
          />
        ) : (
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

        {isBSALocked("contact_person") ? (
          <LockedFieldDisplay
            htmlFor="contact_person"
            label="Ansprechperson (Name, Funktion) *"
            value={values.contact_person}
            source="bestandsaufnahme"
          />
        ) : (
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

      {/* Telefon + Email */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isBSALocked("phone") ? (
          <LockedFieldDisplay
            htmlFor="phone"
            label="Telefon *"
            value={values.phone}
            source="bestandsaufnahme"
          />
        ) : (
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

        {isEmailLocked ? (
          <LockedFieldDisplay
            htmlFor="email"
            label="E-Mail *"
            value={values.email}
            source="konto"
            mono
            hint={
              <>
                Wird aus Ihrem Konto übernommen. Änderbar unter{" "}
                <Link
                  href="/best-practice/konto"
                  className="underline underline-offset-2 hover:text-primary transition-colors"
                >
                  Mein Konto
                </Link>
                .
              </>
            }
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
              Tipp: Verwenden Sie dieselbe E-Mail wie Ihr Konto in der{" "}
              <a
                href="/best-practice/datenbank"
                className="underline underline-offset-2 hover:text-primary transition-colors"
              >
                Best-Practice-Datenbank
              </a>
              , um dort den vollständigen Bearbeitungsstatus einsehen zu können.
            </p>
          </div>
        )}
      </div>

      {/* Lehrkraft- + Schülerzahl */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isBSALocked("teacher_count") ? (
          <LockedFieldDisplay
            htmlFor="teacher_count"
            label="Anzahl Lehrkräfte"
            value={values.teacher_count}
            source="bestandsaufnahme"
          />
        ) : (
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
      </div>
    </div>
  );
}
