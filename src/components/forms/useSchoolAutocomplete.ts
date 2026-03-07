"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface NominatimAddress {
  road?: string;
  house_number?: string;
  postcode?: string;
  city?: string;
  town?: string;
  village?: string;
  county?: string;
}

export interface SchoolSuggestion {
  display_name: string;
  name: string;
  street: string;
  plz: string;
  city: string;
  county: string;
}

export function useSchoolAutocomplete(query: string) {
  const [suggestions, setSuggestions] = useState<SchoolSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const abortRef = useRef<AbortController>(undefined);

  useEffect(() => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      setIsLoading(true);
      try {
        const params = new URLSearchParams({ q: query });
        const res = await fetch(`/api/school-search?${params}`, {
          signal: abortRef.current.signal,
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: any[] = await res.json();
        const mapped: SchoolSuggestion[] = data.map((item) => {
          const addr: NominatimAddress = item.address || {};
          const street = [addr.road, addr.house_number]
            .filter(Boolean)
            .join(" ");
          const city = addr.city || addr.town || addr.village || "";
          return {
            display_name: item.display_name,
            name: item.name || "",
            street,
            plz: addr.postcode || "",
            city,
            county: addr.county || "",
          };
        });
        setSuggestions(mapped);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setSuggestions([]);
        }
      } finally {
        setIsLoading(false);
      }
    }, 350);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  const clearSuggestions = useCallback(() => setSuggestions([]), []);

  return { suggestions, isLoading, clearSuggestions };
}
