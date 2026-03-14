"use client";

import { useState } from "react";
import { ArrowLeftRight, Users, ChevronDown, Plane, Search } from "lucide-react";
import { Airport, SearchParams } from "@/types";
import AirportSearch from "./AirportSearch";
import { getTodayString, generatePassengerLabel, getCabinLabel } from "@/lib/utils";

interface SearchFormProps {
  onSearch: (params: SearchParams) => void;
  loading?: boolean;
  initialParams?: SearchParams | null;
}

const CABIN_OPTIONS = [
  { value: "economy", label: "Economy" },
  { value: "premium_economy", label: "Premium Economy" },
  { value: "business", label: "Business" },
  { value: "first", label: "First Class" },
];

interface PassengerCounts {
  adults: number;
  children: number;
  infants: number;
}

export default function SearchForm({ onSearch, loading = false, initialParams }: SearchFormProps) {
  const [tripType, setTripType] = useState<"one_way" | "round_trip">(
    initialParams?.returnDate ? "round_trip" : "one_way"
  );
  const [origin, setOrigin] = useState<Airport | null>(null);
  const [destination, setDestination] = useState<Airport | null>(null);
  const [date, setDate] = useState(initialParams?.date || "");
  const [returnDate, setReturnDate] = useState(initialParams?.returnDate || "");
  const [passengers, setPassengers] = useState<PassengerCounts>({
    adults: initialParams?.adults || 1,
    children: initialParams?.children || 0,
    infants: initialParams?.infants || 0,
  });
  const [cabinClass, setCabinClass] = useState(initialParams?.cabinClass || "economy");
  const [showPassengers, setShowPassengers] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const today = getTodayString();
  const totalPassengers = passengers.adults + passengers.children + passengers.infants;
  const passengerLabel = generatePassengerLabel(passengers.adults, passengers.children, passengers.infants);

  function swapAirports() {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
  }

  function adjustPassenger(type: keyof PassengerCounts, delta: number) {
    setPassengers((prev) => {
      const next = { ...prev, [type]: Math.max(0, prev[type] + delta) };
      if (next.adults < 1) next.adults = 1;
      if (next.adults > 9) next.adults = 9;
      if (next.children > 8) next.children = 8;
      if (next.infants > 4) next.infants = 4;
      return next;
    });
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!origin?.iata) errs.origin = "Please select an origin airport";
    if (!destination?.iata) errs.destination = "Please select a destination airport";
    if (origin?.iata && destination?.iata && origin.iata === destination.iata) {
      errs.destination = "Origin and destination cannot be the same";
    }
    if (!date) errs.date = "Please select a departure date";
    if (tripType === "round_trip" && !returnDate) errs.returnDate = "Please select a return date";
    if (tripType === "round_trip" && returnDate && date && returnDate < date) {
      errs.returnDate = "Return date must be after departure date";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    onSearch({
      originSkyId: origin!.skyId,
      originEntityId: origin!.entityId,
      destinationSkyId: destination!.skyId,
      destinationEntityId: destination!.entityId,
      originLabel: `${origin!.city} (${origin!.iata})`,
      destinationLabel: `${destination!.city} (${destination!.iata})`,
      date,
      returnDate: tripType === "round_trip" ? returnDate : undefined,
      adults: passengers.adults,
      children: passengers.children,
      infants: passengers.infants,
      cabinClass,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 sm:p-8 border border-white/50">

        {/* Trip type toggle */}
        <div className="flex gap-2 mb-6">
          {(["one_way", "round_trip"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setTripType(type)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                tripType === type
                  ? "bg-blue-900 text-white shadow-md"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {type === "one_way" ? "One Way" : "Round Trip"}
            </button>
          ))}
        </div>

        {/* Route row */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-end mb-4">
          <div>
            <AirportSearch
              label="From"
              placeholder="City or airport..."
              value={origin}
              onSelect={setOrigin}
            />
            {errors.origin && <p className="text-red-500 text-xs mt-1">{errors.origin}</p>}
          </div>

          {/* Swap button */}
          <div className="flex justify-center mb-1">
            <button
              type="button"
              onClick={swapAirports}
              className="w-10 h-10 rounded-full bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 flex items-center justify-center text-blue-600 transition-all hover:scale-110 active:scale-95"
              title="Swap airports"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>
          </div>

          <div>
            <AirportSearch
              label="To"
              placeholder="City or airport..."
              value={destination}
              onSelect={setDestination}
            />
            {errors.destination && <p className="text-red-500 text-xs mt-1">{errors.destination}</p>}
          </div>
        </div>

        {/* Date / Passengers / Cabin row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {/* Departure date */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Departure</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={today}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all bg-white text-slate-800"
            />
            {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
          </div>

          {/* Return date */}
          {tripType === "round_trip" && (
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Return</label>
              <input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                min={date || today}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all bg-white text-slate-800"
              />
              {errors.returnDate && <p className="text-red-500 text-xs mt-1">{errors.returnDate}</p>}
            </div>
          )}

          {/* Passengers */}
          <div className="relative">
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Passengers</label>
            <button
              type="button"
              onClick={() => setShowPassengers(!showPassengers)}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm text-left flex items-center justify-between focus:outline-none focus:border-blue-400 transition-all bg-white hover:border-slate-300"
            >
              <span className="flex items-center gap-2 text-slate-700">
                <Users className="w-4 h-4 text-slate-400" />
                {passengerLabel}
              </span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showPassengers ? "rotate-180" : ""}`} />
            </button>

            {showPassengers && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-100 z-40 p-4 animate-fade-in">
                {(
                  [
                    { key: "adults", label: "Adults", sub: "12+ years" },
                    { key: "children", label: "Children", sub: "2-11 years" },
                    { key: "infants", label: "Infants", sub: "Under 2" },
                  ] as { key: keyof PassengerCounts; label: string; sub: string }[]
                ).map(({ key, label, sub }) => (
                  <div key={key} className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{label}</p>
                      <p className="text-xs text-slate-400">{sub}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => adjustPassenger(key, -1)}
                        className="w-8 h-8 rounded-full border-2 border-slate-200 flex items-center justify-center text-slate-600 hover:border-blue-300 hover:text-blue-600 transition-colors disabled:opacity-30"
                        disabled={key === "adults" ? passengers[key] <= 1 : passengers[key] <= 0}
                      >
                        <span className="text-lg leading-none">−</span>
                      </button>
                      <span className="w-6 text-center font-semibold text-slate-800 text-sm">
                        {passengers[key]}
                      </span>
                      <button
                        type="button"
                        onClick={() => adjustPassenger(key, 1)}
                        className="w-8 h-8 rounded-full border-2 border-slate-200 flex items-center justify-center text-slate-600 hover:border-blue-300 hover:text-blue-600 transition-colors"
                      >
                        <span className="text-lg leading-none">+</span>
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setShowPassengers(false)}
                  className="mt-3 w-full py-2 text-sm font-medium text-blue-700 hover:text-blue-900 transition-colors"
                >
                  Done · {totalPassengers} {totalPassengers === 1 ? "passenger" : "passengers"}
                </button>
              </div>
            )}
          </div>

          {/* Cabin class */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Cabin Class</label>
            <div className="relative">
              <select
                value={cabinClass}
                onChange={(e) => setCabinClass(e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all bg-white text-slate-700 appearance-none pr-10"
              >
                {CABIN_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Search button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 gradient-brand text-white font-semibold rounded-xl text-base shadow-lg hover:shadow-xl hover:opacity-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.99]"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Searching Flights...
            </>
          ) : (
            <>
              <Search className="w-5 h-5" />
              Search Flights
            </>
          )}
        </button>
      </div>
    </form>
  );
}
