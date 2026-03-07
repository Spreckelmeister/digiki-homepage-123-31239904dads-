"use client";

import { useState, useRef } from "react";
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
}

export default function SchoolInfoFields({
  values,
  onChange,
  inputClass,
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

  return (
    <fieldset>
      <legend className="text-lg font-semibold text-primary mb-4">
        1. Angaben zur Schule
      </legend>
      <div className="space-y-4">
        {/* Schulname mit Autocomplete */}
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
                200
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
              setShowAddressSuggestions(true);
            }}
            onFocus={() => setShowAddressSuggestions(true)}
            onBlur={() => {
              addressBlurRef.current = setTimeout(
                () => setShowAddressSuggestions(false),
                200
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
            <p className="mt-1.5 text-xs text-text-light">
              Tipp: Verwenden Sie dieselbe E-Mail wie Ihr Konto in der{" "}
              <a href="/best-practice/datenbank" className="underline underline-offset-2 hover:text-primary transition-colors">Best-Practice-Datenbank</a>,
              um dort den vollständigen Bearbeitungsstatus einsehen zu können.
            </p>
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
