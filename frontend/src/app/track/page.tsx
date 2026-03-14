"use client";

import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Loader2,
  Phone,
  Plane,
  Search,
  XCircle,
} from "lucide-react";
import { trackBooking } from "@/lib/api";
import { BookingTrackResponse } from "@/types";
import { getCabinLabel } from "@/lib/utils";

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { icon: React.ElementType; color: string; bg: string; border: string; step: number }
> = {
  new:       { icon: Clock,         color: "text-blue-700",    bg: "bg-blue-50",    border: "border-blue-200",   step: 1 },
  pending:   { icon: Clock,         color: "text-blue-700",    bg: "bg-blue-50",    border: "border-blue-200",   step: 1 },
  contacted: { icon: Phone,         color: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-200",  step: 2 },
  confirmed: { icon: CheckCircle2,  color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200",step: 3 },
  completed: { icon: CheckCircle2,  color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200",step: 3 },
  cancelled: { icon: XCircle,       color: "text-red-700",     bg: "bg-red-50",     border: "border-red-200",    step: 0 },
};

const STEPS = [
  { label: "Request Received",   desc: "Your booking request has been received" },
  { label: "Team Contacted",     desc: "Our team has reviewed and reached out" },
  { label: "Booking Confirmed",  desc: "Booking confirmed, payment details sent" },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function TrackPage() {
  const [refInput, setRefInput] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState<BookingTrackResponse | null>(null);
  const [error,    setError]    = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const ref = refInput.trim().toUpperCase();
    if (!ref) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await trackBooking(ref);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking not found. Check your reference number.");
    } finally {
      setLoading(false);
    }
  }

  const cfg = result ? (STATUS_CONFIG[result.status] ?? STATUS_CONFIG["new"]) : null;
  const StatusIcon = cfg?.icon ?? Clock;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50">

      {/* ── Hero ── */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 py-14 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 mb-3">
            <Plane className="w-6 h-6 text-sky-300" />
            <span className="text-sky-300 font-semibold text-sm tracking-wide uppercase">Booking Tracker</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
            Track Your Booking
          </h1>
          <p className="text-blue-200 text-base leading-relaxed">
            Enter your reference number to check the status of your booking request.
          </p>
        </div>
      </div>

      {/* ── Search form ── */}
      <div className="max-w-2xl mx-auto px-4 -mt-6">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={refInput}
                onChange={(e) => setRefInput(e.target.value)}
                placeholder="e.g. SR-20240315-AB1C2D"
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm font-mono
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  placeholder:text-slate-400 placeholder:font-sans uppercase"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !refInput.trim()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold rounded-xl
                transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {loading ? "Searching…" : "Track"}
            </button>
          </form>

          {error && (
            <div className="mt-4 flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
              <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Result ── */}
      {result && cfg && (
        <div className="max-w-2xl mx-auto px-4 mt-6 pb-16 space-y-4">

          {/* Status card */}
          <div className={`bg-white rounded-2xl border-2 ${cfg.border} shadow-sm p-6`}>
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0`}>
                <StatusIcon className={`w-6 h-6 ${cfg.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                    {result.status_label}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">{result.reference_id}</span>
                </div>
                <p className="text-slate-700 text-sm leading-relaxed">{result.status_description}</p>
              </div>
            </div>
          </div>

          {/* Progress tracker */}
          {result.status !== "cancelled" && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="text-sm font-bold text-slate-700 mb-5 uppercase tracking-wide">Progress</h3>
              <div className="space-y-0">
                {STEPS.map((step, i) => {
                  const stepNum  = i + 1;
                  const done     = cfg.step > stepNum;
                  const active   = cfg.step === stepNum;
                  const upcoming = cfg.step < stepNum;
                  return (
                    <div key={step.label} className="flex items-start gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
                          done    ? "bg-emerald-500 border-emerald-500 text-white"
                          : active  ? "bg-blue-600 border-blue-600 text-white"
                          : "bg-white border-slate-200 text-slate-400"
                        }`}>
                          {done ? "✓" : stepNum}
                        </div>
                        {i < STEPS.length - 1 && (
                          <div className={`w-0.5 h-8 mt-1 ${done || active ? "bg-blue-200" : "bg-slate-100"}`} />
                        )}
                      </div>
                      <div className="pt-1 pb-8">
                        <p className={`text-sm font-semibold ${done || active ? "text-slate-900" : "text-slate-400"}`}>
                          {step.label}
                        </p>
                        <p className={`text-xs mt-0.5 ${done || active ? "text-slate-500" : "text-slate-300"}`}>
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Booking summary */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wide flex items-center gap-2">
              <Plane className="w-4 h-4 text-blue-500" /> Flight Details
            </h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              {[
                { label: "Passenger",   value: result.first_name },
                { label: "Route",       value: `${result.origin} → ${result.destination}` },
                { label: "Airline",     value: result.airline },
                { label: "Flight",      value: result.flight_number },
                { label: "Departure",   value: result.departure_date },
                ...(result.return_date ? [{ label: "Return", value: result.return_date }] : []),
                { label: "Passengers",  value: String(result.num_passengers) },
                { label: "Cabin",       value: getCabinLabel(result.cabin_class) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-slate-400">{label}</p>
                  <p className="font-semibold text-slate-800">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Help card */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex items-start gap-3">
            <Phone className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-900 mb-1">Need help?</p>
              <p className="text-xs text-blue-700 leading-relaxed">
                Our team is here to assist. Reply to your confirmation email or contact us directly.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Empty state hint ── */}
      {!result && !error && (
        <div className="max-w-2xl mx-auto px-4 mt-10 text-center">
          <div className="text-slate-300 mb-4">
            <Plane className="w-16 h-16 mx-auto" />
          </div>
          <p className="text-slate-500 text-sm">
            Your reference number was emailed to you after completing the booking request.
            <br />It looks like <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">SR-YYYYMMDD-XXXXXX</code>.
          </p>
        </div>
      )}
    </div>
  );
}
