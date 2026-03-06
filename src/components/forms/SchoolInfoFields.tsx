"use client";

import { useState, useRef } from "react";
import {
  useAddressAutocomplete,
  type AddressSuggestion,
} from "./useAddressAutocomplete";

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
}

export default function SchoolInfoFields({
  values,
  onChange,
  inputClass,
}: SchoolInfoFieldsProps) {
  const { suggestions, isLoading, clearSuggestions } =
    useAddressAutocomplete(values.school_street);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  function handleSelectSuggestion(suggestion: AddressSuggestion) {
    onChange("school_street", suggestion.street);
    onChange("school_plz", suggestion.plz);
    onChange("school_city", suggestion.city);
    clearSuggestions();
    setShowSuggestions(false);
  }

  return (
    <fieldset>
      <legend className="text-lg font-semibold text-primary mb-4">
        1. Angaben zur Schule
      </legend>
      <div className="space-y-4">
        <div>
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
            value={values.school_name}
            onChange={(e) => onChange("school_name", e.target.value)}
            className={inputClass}
            placeholder="z.B. Grundschule Eversburg"
          />
        </div>

        {/* Straße mit Autocomplete */}
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
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => {
              blurTimeoutRef.current = setTimeout(
                () => setShowSuggestions(false),
                200
              );
            }}
            className={inputClass}
            placeholder="z.B. Musterstraße 12"
          />
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute z-10 w-full mt-1 bg-white border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {suggestions.map((s, i) => (
                <li key={i}>
                  <button
                    type="button"
                    className="w-full text-left px-4 py-2 text-sm hover:bg-primary/5 transition-colors"
                    onMouseDown={() => {
                      if (blurTimeoutRef.current)
                        clearTimeout(blurTimeoutRef.current);
                    }}
                    onClick={() => handleSelectSuggestion(s)}
                  >
                    {s.display_name}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {isLoading && showSuggestions && (
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
    </fieldset>
  );
}
