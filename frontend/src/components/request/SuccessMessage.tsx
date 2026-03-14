"use client";

import Link from "next/link";
import { CheckCircle2, Mail, Clock, Phone, Plane, Search, User, Users } from "lucide-react";
import { OtpVerifyResponse, BookingRequestSubmit } from "@/types";
import { formatPrice, getCabinLabel } from "@/lib/utils";

interface SuccessMessageProps {
  response: OtpVerifyResponse;
  booking: BookingRequestSubmit;
  onSearchAgain: () => void;
}

export default function SuccessMessage({ response, booking, onSearchAgain }: SuccessMessageProps) {
  return (
    <div className="max-w-3xl mx-auto py-8 animate-fade-in">

      {/* ── Hero ── */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-5">
          <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center animate-check-bounce">
            <CheckCircle2 className="w-14 h-14 text-emerald-500" strokeWidth={1.5} />
          </div>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Booking Request Submitted!</h1>
        <p className="text-slate-500 text-lg">
          Thank you, {booking.first_name}. Our team will contact you within 24 hours.
        </p>
        {/* Email confirmation status */}
        {response.email_sent ? (
          <div className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm font-medium">
            <Mail className="w-4 h-4" />
            Confirmation email sent to {booking.email}
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm font-medium">
            <Mail className="w-4 h-4" />
            Email confirmation unavailable — we&apos;ll contact you directly
          </div>
        )}
      </div>

      {/* ── Reference ID ── */}
      <div className="bg-gradient-to-r from-blue-50 to-sky-50 border-2 border-blue-200 rounded-2xl px-8 py-6 mb-6 text-center">
        <p className="text-xs font-semibold text-blue-500 uppercase tracking-widest mb-2">
          Your Reference Number
        </p>
        <p className="text-4xl font-extrabold text-blue-900 tracking-widest font-mono">
          {response.reference_id}
        </p>
        <p className="text-xs text-slate-400 mt-2">Save this for your records</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">

        {/* ── Contact details ── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2 uppercase tracking-wide">
            <User className="w-4 h-4 text-blue-500" /> Contact Details
          </h3>
          <div className="space-y-2">
            {[
              { label: "Name",  value: `${booking.first_name} ${booking.last_name}` },
              { label: "Email", value: booking.email },
              { label: "Phone", value: booking.phone },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm gap-3">
                <span className="text-slate-500 shrink-0">{label}</span>
                <span className="font-semibold text-slate-800 text-right break-all">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Flight details ── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2 uppercase tracking-wide">
            <Plane className="w-4 h-4 text-blue-500" /> Flight Details
          </h3>
          <div className="space-y-2">
            {[
              { label: "Airline",    value: booking.airline },
              { label: "Flight No.", value: booking.flight_number },
              { label: "Route",      value: `${booking.origin} → ${booking.destination}` },
              { label: "Departure",  value: booking.departure_date },
              ...(booking.return_date ? [{ label: "Return", value: booking.return_date }] : []),
              { label: "Cabin",      value: getCabinLabel(booking.cabin_class) },
              { label: "Price",      value: formatPrice(booking.price, booking.currency) },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm gap-3">
                <span className="text-slate-500 shrink-0">{label}</span>
                <span className="font-semibold text-slate-800 text-right">{value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── Passenger names ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6">
        <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2 uppercase tracking-wide">
          <Users className="w-4 h-4 text-blue-500" /> Passengers ({booking.num_passengers})
        </h3>
        <div className="flex flex-wrap gap-2">
          {booking.passenger_names.map((name, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700"
            >
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                {i + 1}
              </span>
              {name}
            </span>
          ))}
        </div>
        {booking.special_requests && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500 mb-1">Special Requests</p>
            <p className="text-sm text-slate-700">{booking.special_requests}</p>
          </div>
        )}
      </div>

      {/* ── What happens next ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-8">
        <h2 className="text-base font-bold text-slate-800 mb-5 text-center">What Happens Next?</h2>
        <div className="space-y-4">
          {[
            {
              icon: Mail,
              color: response.email_sent ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600",
              title: response.email_sent ? "Confirmation email sent" : "Email confirmation unavailable",
              desc: response.email_sent
                ? "Check your inbox for your booking request confirmation."
                : "Your request is saved. We will contact you directly via phone or email.",
            },
            {
              icon: Clock,
              color: "bg-amber-100 text-amber-600",
              title: "Review within 24 hours",
              desc:  "Our travel specialists review your request and source the best available fare.",
            },
            {
              icon: Phone,
              color: "bg-emerald-100 text-emerald-600",
              title: "We will contact you",
              desc:  "You will be contacted via email or phone with booking confirmation and payment options.",
            },
          ].map(({ icon: Icon, color, title, desc }) => (
            <div key={title} className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center shrink-0`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm">{title}</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CTA ── */}
      <div className="text-center space-y-3">
        <button
          type="button"
          onClick={onSearchAgain}
          className="inline-flex items-center gap-2 px-8 py-4 gradient-brand text-white font-bold rounded-2xl shadow-lg hover:shadow-xl hover:opacity-95 transition-all active:scale-[0.99]"
        >
          <Plane className="w-5 h-5" />
          Search Another Flight
        </button>
        <div>
          <Link
            href={`/track`}
            className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            Track this booking later using your reference number
          </Link>
        </div>
      </div>
    </div>
  );
}
