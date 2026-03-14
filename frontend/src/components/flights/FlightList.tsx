"use client";

import { useMemo } from "react";
import { Plane } from "lucide-react";
import { FlightItinerary } from "@/types";
import FlightCard from "./FlightCard";
import FiltersPanel, { FilterState } from "./FiltersPanel";

interface FlightListProps {
  flights:       FlightItinerary[];
  loading:       boolean;
  onSelect:      (flight: FlightItinerary) => void;
  selectedFlight: FlightItinerary | null;
  filters:       FilterState;
  onFiltersChange: (next: FilterState) => void;
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="flex gap-4 items-start">
        <div className="w-11 h-11 rounded-xl skeleton shrink-0"></div>
        <div className="flex-1 space-y-3">
          <div className="w-32 h-4 skeleton rounded"></div>
          <div className="w-20 h-3 skeleton rounded"></div>
        </div>
        <div className="flex-1 flex justify-between">
          <div className="space-y-2">
            <div className="w-16 h-8 skeleton rounded"></div>
            <div className="w-12 h-3 skeleton rounded"></div>
          </div>
          <div className="w-12 h-6 skeleton rounded-full mx-auto self-center"></div>
          <div className="space-y-2">
            <div className="w-16 h-8 skeleton rounded"></div>
            <div className="w-12 h-3 skeleton rounded"></div>
          </div>
        </div>
        <div className="flex flex-col gap-2 items-end ml-4">
          <div className="w-20 h-8 skeleton rounded"></div>
          <div className="w-28 h-10 skeleton rounded-xl"></div>
        </div>
      </div>
    </div>
  );
}

export default function FlightList({
  flights,
  loading,
  onSelect,
  selectedFlight,
  filters,
  onFiltersChange,
}: FlightListProps) {
  const filtered = useMemo(() => {
    let list = [...flights];

    // Stop filter
    if (filters.stops.size > 0) {
      list = list.filter((f) => {
        const s = f.legs[0].stops;
        return (
          (filters.stops.has("direct") && s === 0) ||
          (filters.stops.has("1stop")  && s === 1) ||
          (filters.stops.has("2plus")  && s >= 2)
        );
      });
    }

    // Price filter
    if (filters.maxPrice !== null) {
      list = list.filter((f) => f.price <= filters.maxPrice!);
    }

    // Airline filter
    if (filters.airlines.size > 0) {
      list = list.filter((f) =>
        f.legs[0].carriers.some((c) => filters.airlines.has(c))
      );
    }

    // Sort
    switch (filters.sort) {
      case "cheapest": list.sort((a, b) => a.price - b.price); break;
      case "fastest":  list.sort((a, b) => a.legs[0].duration_minutes - b.legs[0].duration_minutes); break;
      default:         list.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    }

    return list;
  }, [flights, filters]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 h-64 skeleton" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5 items-start">

      {/* FiltersPanel — sticky sidebar */}
      <FiltersPanel
        flights={flights}
        state={filters}
        onChange={onFiltersChange}
        resultCount={filtered.length}
        className="lg:sticky lg:top-24"
      />

      {/* Flight cards */}
      <div>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <Plane className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-semibold text-slate-600 mb-1">No flights found</h3>
            <p className="text-sm text-slate-400 max-w-xs">
              {filters.stops.size > 0 || filters.airlines.size > 0
                ? "Try adjusting your filters to see more results."
                : "No flights match your search. Try different dates or airports."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((flight) => (
              <FlightCard
                key={flight.id}
                flight={flight}
                onSelect={onSelect}
                isSelected={selectedFlight?.id === flight.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
