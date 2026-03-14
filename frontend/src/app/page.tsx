"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Globe2,
  HeadphonesIcon,
  Plane,
  Search,
  Shield,
  Star,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";
import { SearchParams } from "@/types";
import { searchFlights } from "@/lib/api";
import { saveSearchSession } from "@/lib/session";
import SearchForm from "@/components/search/SearchForm";

// ── Popular destinations ───────────────────────────────────────────────────────

const DESTINATIONS = [
  { from: "London",    to: "Dubai",         code: "DXB", gradient: "from-amber-400 to-orange-500",  emoji: "🌆" },
  { from: "New York",  to: "London",        code: "LHR", gradient: "from-blue-500 to-indigo-600",   emoji: "🎡" },
  { from: "Dubai",     to: "Singapore",     code: "SIN", gradient: "from-emerald-400 to-teal-500",  emoji: "🌴" },
  { from: "London",    to: "New York",      code: "JFK", gradient: "from-sky-400 to-blue-600",      emoji: "🗽" },
  { from: "Frankfurt", to: "Tokyo",         code: "NRT", gradient: "from-pink-400 to-rose-500",     emoji: "⛩️" },
  { from: "Paris",     to: "Bangkok",       code: "BKK", gradient: "from-purple-400 to-violet-600", emoji: "🏯" },
];

// ── Airline logos (text-based, coloured) ─────────────────────────────────────

const AIRLINES = [
  { name: "Emirates",           code: "EK", color: "text-red-600",    bg: "bg-red-50"    },
  { name: "British Airways",    code: "BA", color: "text-blue-700",   bg: "bg-blue-50"   },
  { name: "Qatar Airways",      code: "QR", color: "text-purple-700", bg: "bg-purple-50" },
  { name: "Singapore Airlines", code: "SQ", color: "text-amber-600",  bg: "bg-amber-50"  },
  { name: "Lufthansa",          code: "LH", color: "text-yellow-700", bg: "bg-yellow-50" },
  { name: "Air France",         code: "AF", color: "text-sky-700",    bg: "bg-sky-50"    },
  { name: "Turkish Airlines",   code: "TK", color: "text-red-700",    bg: "bg-red-50"    },
  { name: "KLM",                code: "KL", color: "text-cyan-700",   bg: "bg-cyan-50"   },
];

// ── How it works ──────────────────────────────────────────────────────────────

const STEPS = [
  {
    num: "01",
    icon: Search,
    title: "Search Flights",
    desc: "Enter your route, dates, and passenger details to browse live flight options.",
    color: "bg-blue-100 text-blue-600",
  },
  {
    num: "02",
    icon: Plane,
    title: "Request Booking",
    desc: "Select your preferred flight and submit a booking request — completely free, no payment needed.",
    color: "bg-emerald-100 text-emerald-600",
  },
  {
    num: "03",
    icon: HeadphonesIcon,
    title: "We Contact You",
    desc: "Our travel specialists review your request and reach out within 24 hours with confirmation details.",
    color: "bg-purple-100 text-purple-600",
  },
];

// ── Reviews ───────────────────────────────────────────────────────────────────

const REVIEWS = [
  { name: "Sarah M.",    rating: 5, text: "Incredibly easy to use. Got a great deal on a business class flight to Dubai!", location: "London" },
  { name: "James T.",    rating: 5, text: "The team was responsive and got me the exact flight I wanted at a great price.", location: "New York" },
  { name: "Amina K.",    rating: 5, text: "Saved hundreds on a family trip to Singapore. Will definitely use again.", location: "Toronto" },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  const router  = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSearch(params: SearchParams) {
    setLoading(true);
    try {
      const flights = await searchFlights(params);
      saveSearchSession(params, flights);
      router.push("/results");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Search failed. Please try again.");
      setLoading(false);
    }
  }

  return (
    <>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-sky-800 py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-sky-500/10 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/90 text-sm font-medium mb-5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live flight search &middot; No fees &middot; Expert assistance
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight mb-4">
              Find Your
              <span className="text-sky-300"> Perfect </span>
              Flight
            </h1>
            <p className="text-blue-200 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
              Search thousands of flights, compare prices, and let our specialists handle
              the booking — completely free.
            </p>
          </div>
          <SearchForm onSearch={handleSearch} loading={loading} />
        </div>
      </section>

      {/* ── Stats bar ── */}
      <div className="bg-blue-900 text-white">
        <div className="max-w-5xl mx-auto px-4 py-4 grid grid-cols-3 divide-x divide-blue-800">
          {[
            { value: "500+", label: "Airlines" },
            { value: "10,000+", label: "Happy Travellers" },
            { value: "24 hrs", label: "Response Time" },
          ].map(({ value, label }) => (
            <div key={label} className="text-center px-4">
              <p className="text-xl sm:text-2xl font-extrabold text-sky-300">{value}</p>
              <p className="text-xs text-blue-300 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Feature cards ── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { icon: Zap,            color: "bg-sky-100 text-sky-600",         title: "Real-time Prices",     desc: "Live flight data from hundreds of airlines worldwide, updated every few minutes." },
            { icon: Shield,         color: "bg-emerald-100 text-emerald-600", title: "No Payment Required",  desc: "Submit a request for free — pay only when our team confirms your booking." },
            { icon: HeadphonesIcon, color: "bg-purple-100 text-purple-600",   title: "Expert Assistance",    desc: "Our travel specialists contact you within 24 hours with the best available fare." },
          ].map(({ icon: Icon, color, title, desc }) => (
            <div key={title} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col items-start gap-4 hover:shadow-md transition-shadow">
              <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 mb-1">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Popular destinations ── */}
      <section className="bg-slate-50 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                <Globe2 className="w-3.5 h-3.5" /> Popular Routes
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                Trending Destinations
              </h2>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {DESTINATIONS.map(({ from, to, code, gradient, emoji }) => (
              <div
                key={code}
                className={`relative rounded-2xl bg-gradient-to-br ${gradient} p-5 text-white overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform shadow-md group`}
                onClick={() => {
                  const el = document.getElementById("search-form");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <div className="absolute right-3 top-3 text-3xl opacity-60 group-hover:opacity-80 transition-opacity">{emoji}</div>
                <p className="text-xs font-medium text-white/75 mb-1">{from}</p>
                <div className="flex items-center gap-1.5 mb-2">
                  <ArrowRight className="w-3.5 h-3.5 text-white/70" />
                  <p className="text-lg font-extrabold">{to}</p>
                </div>
                <span className="inline-block bg-white/20 text-xs font-mono font-bold px-2 py-0.5 rounded-full">
                  {code}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">Simple Process</p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">How SkyRequest Works</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 relative">
          {/* Connector line on desktop */}
          <div className="hidden sm:block absolute top-8 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-blue-100 to-purple-100" />
          {STEPS.map(({ num, icon: Icon, title, desc, color }) => (
            <div key={num} className="relative flex flex-col items-center text-center">
              <div className={`w-16 h-16 rounded-2xl ${color} flex items-center justify-center mb-4 shadow-sm z-10 relative`}>
                <Icon className="w-7 h-7" />
                <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-white border-2 border-slate-100 text-slate-500 text-xs font-black flex items-center justify-center shadow-sm">
                  {num.slice(1)}
                </span>
              </div>
              <h3 className="font-bold text-slate-900 mb-2">{title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/track"
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
          >
            <Search className="w-4 h-4" />
            Already have a booking? Track your request
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* ── Partner airlines ── */}
      <section className="bg-slate-50 py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">
            We work with leading airlines
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {AIRLINES.map(({ name, code, color, bg }) => (
              <div
                key={code}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-slate-200 ${bg} shadow-sm`}
              >
                <span className={`text-lg font-black font-mono ${color}`}>{code}</span>
                <span className="text-sm font-semibold text-slate-600">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Reviews ── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-10">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">Testimonials</p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">What Our Customers Say</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {REVIEWS.map(({ name, rating, text, location }) => (
            <div key={name} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center gap-0.5 mb-3">
                {Array.from({ length: rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">&ldquo;{text}&rdquo;</p>
              <div>
                <p className="text-sm font-bold text-slate-800">{name}</p>
                <p className="text-xs text-slate-400">{location}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA band ── */}
      <section className="bg-gradient-to-r from-blue-900 to-blue-700 py-14 px-4 text-center">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
          Ready to find your next flight?
        </h2>
        <p className="text-blue-200 mb-6 text-sm">
          Free service. Expert team. Fast response.
        </p>
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-blue-900 font-bold rounded-2xl
            hover:bg-blue-50 transition-colors shadow-lg text-sm"
        >
          <Plane className="w-4 h-4" />
          Search Flights Now
        </button>
      </section>
    </>
  );
}
