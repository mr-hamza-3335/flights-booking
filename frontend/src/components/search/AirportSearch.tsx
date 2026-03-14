"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Loader2, X, Search } from "lucide-react";
import { Airport } from "@/types";
import { searchAirports } from "@/lib/api";

interface AirportSearchProps {
  label: string;
  placeholder: string;
  value: Airport | null;
  onSelect: (airport: Airport) => void;
  className?: string;
}

export default function AirportSearch({
  label,
  placeholder,
  value,
  onSelect,
  className = "",
}: AirportSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Airport[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayValue = value ? `${value.city} (${value.iata})` : "";

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const data = await searchAirports(q);
      setResults(data);
      setOpen(true);
      setActiveIndex(-1);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => doSearch(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, doSearch]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(airport: Airport) {
    onSelect(airport);
    setQuery("");
    setOpen(false);
    setResults([]);
  }

  function handleClear() {
    setQuery("");
    setOpen(false);
    setResults([]);
    onSelect({ skyId: "", entityId: "", name: "", city: "", country: "", iata: "", type: "" });
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(results[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <label className="block text-sm font-medium text-slate-600 mb-1.5">{label}</label>

      {value?.iata ? (
        /* Selected state */
        <div className="flex items-center gap-2 w-full px-4 py-3 bg-blue-50 border-2 border-blue-200 rounded-xl">
          <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-blue-900 text-sm truncate">
              {value.city} ({value.iata})
            </p>
            <p className="text-xs text-slate-500 truncate">{value.name}</p>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="p-1 rounded-full hover:bg-blue-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        /* Search input */
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {loading ? (
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
            ) : (
              <Search className="w-4 h-4 text-slate-400" />
            )}
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => query.length >= 2 && results.length > 0 && setOpen(true)}
            placeholder={placeholder}
            className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all placeholder:text-slate-400 bg-white"
            autoComplete="off"
          />
        </div>
      )}

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-100 z-50 max-h-72 overflow-y-auto scrollbar-thin animate-fade-in">
          {results.map((airport, idx) => (
            <button
              key={`${airport.iata}-${idx}`}
              type="button"
              onClick={() => handleSelect(airport)}
              className={`w-full px-4 py-3 text-left flex items-start gap-3 hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-0 ${
                idx === activeIndex ? "bg-blue-50" : ""
              }`}
            >
              <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-blue-700">{airport.iata}</span>
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-slate-800 text-sm">
                  {airport.city}
                  <span className="ml-1 font-normal text-slate-500">· {airport.country}</span>
                </p>
                <p className="text-xs text-slate-500 truncate">{airport.name}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {open && !loading && results.length === 0 && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-100 z-50 px-4 py-6 text-center">
          <p className="text-sm text-slate-500">No airports found for &ldquo;{query}&rdquo;</p>
        </div>
      )}
    </div>
  );
}
