"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plane } from "lucide-react";
import toast from "react-hot-toast";
import { FlightItinerary } from "@/types";
import { getSearchParams, getFlights, saveSelectedFlight } from "@/lib/session";
import { formatPrice, getCabinLabel, generatePassengerLabel } from "@/lib/utils";
import FlightList from "@/components/flights/FlightList";
import { FilterState, buildInitialFilters } from "@/components/flights/FiltersPanel";

export default function ResultsPage() {
  const router = useRouter();

  const searchParams    = getSearchParams();
  const flights         = getFlights();

  const [selectedFlight,  setSelectedFlight]  = useState<FlightItinerary | null>(null);
  const [filters,         setFilters]         = useState<FilterState>(() => buildInitialFilters(flights));

  // Redirect to home if session is missing
  useEffect(() => {
    if (!searchParams || flights.length === 0) {
      router.replace("/");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!searchParams) return null;

  function handleSelect(flight: FlightItinerary) {
    setSelectedFlight(flight);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleContinue() {
    if (!selectedFlight) { toast.error("Please select a flight first."); return; }
    saveSelectedFlight(selectedFlight);
    router.push("/booking");
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-slate-500 hover:text-blue-700 text-sm font-medium mb-2 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            New search
          </button>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
            {searchParams.originLabel}
            <span className="mx-2 text-slate-300">→</span>
            {searchParams.destinationLabel}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {searchParams.date}
            {searchParams.returnDate && ` – ${searchParams.returnDate}`}
            {" · "}
            {generatePassengerLabel(searchParams.adults, searchParams.children, searchParams.infants)}
            {" · "}
            {getCabinLabel(searchParams.cabinClass)}
          </p>
        </div>

        {selectedFlight && (
          <button
            type="button"
            onClick={handleContinue}
            className="hidden sm:flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all whitespace-nowrap"
          >
            <Plane className="w-4 h-4" />
            Continue with selected
          </button>
        )}
      </div>

      <FlightList
        flights={flights}
        loading={false}
        onSelect={handleSelect}
        selectedFlight={selectedFlight}
        filters={filters}
        onFiltersChange={setFilters}
      />

      {/* Sticky bottom bar */}
      {selectedFlight && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-2xl z-40 p-4">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate">
                {selectedFlight.legs[0].carriers[0]}
                <span className="ml-2 font-mono text-blue-600">{selectedFlight.legs[0].flight_number}</span>
              </p>
              <p className="text-xs text-slate-500 truncate">
                {searchParams.originLabel} → {searchParams.destinationLabel}
              </p>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <div className="text-right">
                <p className="text-xl font-extrabold text-blue-800">
                  {formatPrice(selectedFlight.price, selectedFlight.currency)}
                </p>
                <p className="text-xs text-slate-400">per person</p>
              </div>
              <button
                type="button"
                onClick={handleContinue}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all whitespace-nowrap"
              >
                Continue →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
