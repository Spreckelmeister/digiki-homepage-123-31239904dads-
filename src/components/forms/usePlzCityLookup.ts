"use client";

import { useState, useEffect, useRef } from "react";

interface NominatimAddress {
  postcode?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
}

/**
 * Schlägt zu einer deutschen 5-stelligen PLZ den Ort über Nominatim nach.
 * Liefert `null`, solange die PLZ unvollständig oder kein Treffer gefunden
 * wurde. Debounce 300ms; abortet vorherige Requests.
 */
export function usePlzCityLookup(plz: string): {
  city: string | null;
  isLoading: boolean;
} {
  const [city, setCity] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const abortRef = useRef<AbortController>(undefined);

  useEffect(() => {
    const cleaned = plz.trim();
    if (!/^\d{5}$/.test(cleaned)) {
      setCity(null);
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      setIsLoading(true);
      try {
        const params = new URLSearchParams({ postalcode: cleaned });
        const res = await fetch(`/api/address-search?${params}`, {
          signal: abortRef.current.signal,
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: any[] = await res.json();
        const first = data[0];
        const addr: NominatimAddress = first?.address || {};
        const resolved =
          addr.city ||
          addr.town ||
          addr.village ||
          addr.municipality ||
          null;
        setCity(resolved);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setCity(null);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [plz]);

  return { city, isLoading };
}
