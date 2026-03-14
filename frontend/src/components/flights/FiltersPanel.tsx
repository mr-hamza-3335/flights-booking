"use client";

import { useState, useMemo, useEffect } from "react";
import { SlidersHorizontal, X, ChevronDown, ChevronUp } from "lucide-react";
import { FlightItinerary } from "@/types";
import { formatPrice } from "@/lib/utils";

export type SortOption  = "best" | "cheapest" | "fastest";
export type StopFilter  = "direct" | "1stop" | "2plus";

export interface FilterState {
  sort:        SortOption;
  stops:       Set<StopFilter>;
  maxPrice:    number | null;
  airlines:    Set<string>;
}

interface FiltersPanelProps {
  flights:       FlightItinerary[];
  state:         FilterState;
  onChange:      (next: FilterState) => void;
  resultCount:   number;
  className?:    string;
}

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-100 last:border-0 pb-4 mb-4 last:pb-0 last:mb-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-left mb-3 group"
      >
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</span>
        {open
          ? <ChevronUp className="w-4 h-4 text-slate-400" />
          : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {open && children}
    </div>
  );
}

export function buildInitialFilters(flights: FlightItinerary[]): FilterState {
  const prices = flights.map((f) => f.price);
  return {
    sort:     "best",
    stops:    new Set(),
    maxPrice: prices.length > 0 ? Math.max(...prices) : null,
    airlines: new Set(),
  };
}

export default function FiltersPanel({
  flights,
  state,
  onChange,
  resultCount,
  className = "",
}: FiltersPanelProps) {
  // Derived data from flight list
  const { allAirlines, globalMin, globalMax } = useMemo(() => {
    const airlines = new Set<string>();
    let min = Infinity, max = -Infinity;
    for (const f of flights) {
      f.legs[0].carriers.forEach((c) => airlines.add(c));
      if (f.price < min) min = f.price;
      if (f.price > max) max = f.price;
    }
    return {
      allAirlines: [...airlines].sort(),
      globalMin: min === Infinity ? 0 : min,
      globalMax: max === -Infinity ? 9999 : max,
    };
  }, [flights]);

  // Initialise maxPrice once flights load
  useEffect(() => {
    if (state.maxPrice === null && globalMax > 0) {
      onChange({ ...state, maxPrice: globalMax });
    }
  }, [globalMax]); // eslint-disable-line react-hooks/exhaustive-deps

  function setSort(sort: SortOption) {
    onChange({ ...state, sort });
  }

  function toggleStop(stop: StopFilter) {
    const next = new Set(state.stops);
    next.has(stop) ? next.delete(stop) : next.add(stop);
    onChange({ ...state, stops: next });
  }

  function toggleAirline(name: string) {
    const next = new Set(state.airlines);
    next.has(name) ? next.delete(name) : next.add(name);
    onChange({ ...state, airlines: next });
  }

  function setMaxPrice(v: number) {
    onChange({ ...state, maxPrice: v });
  }

  const hasActiveFilters =
    state.stops.size > 0 ||
    state.airlines.size > 0 ||
    (state.maxPrice !== null && state.maxPrice < globalMax);

  function resetAll() {
    onChange({
      sort:     state.sort,
      stops:    new Set(),
      maxPrice: globalMax,
      airlines: new Set(),
    });
  }

  return (
    <aside className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-bold text-slate-800">Filters</span>
          {hasActiveFilters && (
            <span className="w-5 h-5 rounded-full bg-blue-700 text-white text-xs font-bold flex items-center justify-center">
              {state.stops.size + state.airlines.size + (state.maxPrice !== null && state.maxPrice < globalMax ? 1 : 0)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">{resultCount} results</span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetAll}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-0.5 font-medium"
            >
              <X className="w-3 h-3" /> Reset
            </button>
          )}
        </div>
      </div>

      {/* Sort */}
      <Section title="Sort by">
        <div className="flex flex-col gap-1.5">
          {([
            { key: "best",     label: "Best match",   sub: "Optimised score" },
            { key: "cheapest", label: "Cheapest",      sub: "Lowest price first" },
            { key: "fastest",  label: "Fastest",       sub: "Shortest flight" },
          ] as { key: SortOption; label: string; sub: string }[]).map(({ key, label, sub }) => (
            <button
              key={key}
              type="button"
              onClick={() => setSort(key)}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl border-2 text-left transition-all ${
                state.sort === key
                  ? "border-blue-500 bg-blue-50"
                  : "border-slate-100 hover:border-slate-200"
              }`}
            >
              <div>
                <p className={`text-sm font-semibold ${state.sort === key ? "text-blue-800" : "text-slate-700"}`}>
                  {label}
                </p>
                <p className="text-xs text-slate-400">{sub}</p>
              </div>
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                state.sort === key ? "border-blue-500 bg-blue-500" : "border-slate-200"
              }`}>
                {state.sort === key && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
            </button>
          ))}
        </div>
      </Section>

      {/* Stops */}
      <Section title="Number of stops">
        <div className="flex flex-col gap-2">
          {([
            { key: "direct", label: "Direct",   color: "text-emerald-600" },
            { key: "1stop",  label: "1 Stop",   color: "text-amber-600"   },
            { key: "2plus",  label: "2+ Stops", color: "text-orange-600"  },
          ] as { key: StopFilter; label: string; color: string }[]).map(({ key, label, color }) => (
            <label key={key} className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={state.stops.has(key)}
                onChange={() => toggleStop(key)}
                className="w-4 h-4 accent-blue-700 rounded"
              />
              <span className={`text-sm font-medium ${state.stops.has(key) ? color : "text-slate-700"}`}>
                {label}
              </span>
            </label>
          ))}
        </div>
      </Section>

      {/* Price range */}
      {state.maxPrice !== null && globalMax > globalMin && (
        <Section title="Max price">
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1.5">
              <span>{formatPrice(globalMin, "USD")}</span>
              <span className="font-semibold text-blue-700">{formatPrice(state.maxPrice, "USD")}</span>
            </div>
            <input
              type="range"
              min={globalMin}
              max={globalMax}
              step={10}
              value={state.maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-blue-700"
            />
          </div>
        </Section>
      )}

      {/* Airlines */}
      {allAirlines.length > 1 && (
        <Section title="Airlines" defaultOpen={false}>
          <div className="flex flex-col gap-2 max-h-44 overflow-y-auto scrollbar-thin">
            {allAirlines.map((name) => (
              <label key={name} className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={state.airlines.has(name)}
                  onChange={() => toggleAirline(name)}
                  className="w-4 h-4 accent-blue-700 rounded shrink-0"
                />
                <span className="text-sm text-slate-700 truncate">{name}</span>
              </label>
            ))}
          </div>
        </Section>
      )}
    </aside>
  );
}
