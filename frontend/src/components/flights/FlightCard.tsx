"use client";

import { CheckCircle2, Clock, ArrowRight, PlaneTakeoff, PlaneLanding } from "lucide-react";
import { FlightItinerary } from "@/types";
import { formatDuration, formatPrice, formatDateTime, getStopsLabel } from "@/lib/utils";

interface FlightCardProps {
  flight: FlightItinerary;
  onSelect: (flight: FlightItinerary) => void;
  isSelected?: boolean;
}

const AIRLINE_COLORS: Record<string, string> = {
  "British Airways":    "bg-blue-700",
  "Emirates":           "bg-red-600",
  "Qatar Airways":      "bg-purple-700",
  "Lufthansa":          "bg-yellow-600",
  "Air France":         "bg-blue-500",
  "Turkish Airlines":   "bg-red-700",
  "KLM":                "bg-cyan-600",
  "Singapore Airlines": "bg-yellow-500",
  "Delta Air Lines":    "bg-blue-800",
  "United Airlines":    "bg-blue-600",
  "American Airlines":  "bg-slate-700",
  "Swiss International":"bg-red-500",
};

function AirlineAvatar({ name }: { name: string }) {
  const initials = name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const color = AIRLINE_COLORS[name] || "bg-slate-600";
  return (
    <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0`}>
      {initials}
    </div>
  );
}

function StopsBadge({ stops }: { stops: number }) {
  const label = getStopsLabel(stops);
  const style =
    stops === 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : stops === 1 ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-orange-50 text-orange-700 border-orange-200";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${style}`}>
      {label}
    </span>
  );
}

export default function FlightCard({ flight, onSelect, isSelected }: FlightCardProps) {
  const outbound       = flight.legs[0];
  const dep            = formatDateTime(outbound.departure);
  const arr            = formatDateTime(outbound.arrival);
  const primaryCarrier = outbound.carriers[0] || "Unknown";

  return (
    <div
      className={`bg-white rounded-2xl transition-all duration-200 hover:shadow-lg group cursor-pointer ${
        isSelected
          ? "border-2 border-blue-500 shadow-md shadow-blue-100"
          : "border border-slate-100 shadow-sm hover:border-blue-200"
      }`}
      onClick={() => onSelect(flight)}
    >
      <div className="p-5 sm:p-6">

        {/* Tags row */}
        {(flight.tags.length > 0 || isSelected) && (
          <div className="flex flex-wrap gap-2 mb-3">
            {isSelected && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                <CheckCircle2 className="w-3 h-3" /> Selected
              </span>
            )}
            {flight.tags.map((tag) => (
              <span key={tag} className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                tag === "Cheapest" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : tag === "Fastest" ? "bg-sky-50 text-sky-700 border-sky-200"
                : "bg-purple-50 text-purple-700 border-purple-200"
              }`}>{tag}</span>
            ))}
          </div>
        )}

        <div className="flex flex-col lg:flex-row lg:items-center gap-5">

          {/* ── Airline + flight number ── */}
          <div className="flex items-center gap-3 lg:w-44 shrink-0">
            <AirlineAvatar name={primaryCarrier} />
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-800 leading-tight truncate">{primaryCarrier}</p>
              <p className="text-xs font-mono font-semibold text-blue-600 mt-0.5">{outbound.flight_number}</p>
              {outbound.carriers.length > 1 && (
                <p className="text-xs text-slate-400">+{outbound.carriers.length - 1} codeshare</p>
              )}
            </div>
          </div>

          {/* ── Flight timeline ── */}
          <div className="flex-1 grid grid-cols-[1fr_auto_1fr] items-center gap-3">

            {/* Departure */}
            <div>
              <div className="flex items-center gap-1 text-slate-400 mb-0.5">
                <PlaneTakeoff className="w-3.5 h-3.5" />
                <span className="text-xs">Departure</span>
              </div>
              <p className="text-3xl font-extrabold text-slate-900 leading-none tracking-tight">
                {dep.time}
              </p>
              <p className="text-sm font-bold text-blue-700 mt-0.5">{outbound.origin}</p>
              <p className="text-xs text-slate-500 truncate">{outbound.origin_city}</p>
              <p className="text-xs text-slate-400">{dep.date}</p>
            </div>

            {/* Middle — duration */}
            <div className="flex flex-col items-center gap-1 px-2">
              <div className="flex items-center gap-1 text-xs text-slate-400 whitespace-nowrap">
                <Clock className="w-3 h-3" />
                {formatDuration(outbound.duration_minutes)}
              </div>
              <div className="flex items-center w-full gap-1">
                <div className="h-px flex-1 bg-slate-200"></div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              </div>
              <StopsBadge stops={outbound.stops} />
            </div>

            {/* Arrival */}
            <div className="text-right">
              <div className="flex items-center justify-end gap-1 text-slate-400 mb-0.5">
                <span className="text-xs">Arrival</span>
                <PlaneLanding className="w-3.5 h-3.5" />
              </div>
              <p className="text-3xl font-extrabold text-slate-900 leading-none tracking-tight">
                {arr.time}
              </p>
              <p className="text-sm font-bold text-blue-700 mt-0.5">{outbound.destination}</p>
              <p className="text-xs text-slate-500 truncate">{outbound.destination_city}</p>
              <p className="text-xs text-slate-400">{arr.date}</p>
            </div>
          </div>

          {/* ── Price + CTA ── */}
          <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-3 lg:pl-5 lg:border-l border-slate-100 lg:min-w-[140px]">
            <div className="text-right">
              <p className="text-2xl font-extrabold text-blue-900">
                {formatPrice(flight.price, flight.currency)}
              </p>
              <p className="text-xs text-slate-400">est. per person</p>
              {flight.score && (
                <p className="text-xs text-amber-500 font-medium mt-0.5">★ {flight.score}/10</p>
              )}
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onSelect(flight); }}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap active:scale-95 ${
                isSelected
                  ? "bg-blue-700 text-white shadow-md"
                  : "border-2 border-blue-700 text-blue-700 hover:bg-blue-700 hover:text-white group-hover:shadow-md"
              }`}
            >
              {isSelected ? "✓ Selected" : "Request Booking"}
            </button>
          </div>
        </div>

        {/* ── Return leg ── */}
        {flight.legs.length > 1 && (
          <div className="mt-4 pt-4 border-t border-slate-50">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Return Flight</p>
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono font-semibold text-slate-500">{flight.legs[1].flight_number}</span>
              </div>
              <span className="font-bold text-slate-700">{formatDateTime(flight.legs[1].departure).time}</span>
              <span className="text-xs text-slate-400">{flight.legs[1].origin}</span>
              <div className="flex-1 flex items-center gap-1">
                <div className="h-px flex-1 bg-slate-100"></div>
                <span className="text-xs text-slate-400">{formatDuration(flight.legs[1].duration_minutes)}</span>
                <div className="h-px flex-1 bg-slate-100"></div>
              </div>
              <span className="font-bold text-slate-700">{formatDateTime(flight.legs[1].arrival).time}</span>
              <span className="text-xs text-slate-400">{flight.legs[1].destination}</span>
              <StopsBadge stops={flight.legs[1].stops} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
