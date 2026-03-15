"use client";

import { useState } from "react";
import {
  User, Mail, Phone, FileText,
  AlertCircle, Loader2, Users, CheckSquare,
} from "lucide-react";
import {
  FlightItinerary,
  BookingRequestResponse,
  BookingRequestSubmit,
  SearchParams,
} from "@/types";
import { submitBookingRequest } from "@/lib/api";
import {
  formatPrice, formatDateTime, formatDuration,
  getStopsLabel, getCabinLabel, generatePassengerLabel,
} from "@/lib/utils";
import toast from "react-hot-toast";
import ErrorAlert from "@/components/ErrorAlert";

interface BookingFormProps {
  flight:       FlightItinerary;
  searchParams: SearchParams;
  onSuccess:    (response: BookingRequestResponse, payload: BookingRequestSubmit) => void;
}

export default function BookingForm({ flight, searchParams, onSuccess }: BookingFormProps) {
  const outbound        = flight.legs[0];
  const dep             = formatDateTime(outbound.departure);
  const arr             = formatDateTime(outbound.arrival);
  const totalPassengers = searchParams.adults + searchParams.children + searchParams.infants;

  const [firstName,       setFirstName]       = useState("");
  const [lastName,        setLastName]        = useState("");
  const [email,           setEmail]           = useState("");
  const [phone,           setPhone]           = useState("");
  const [passengerNames,  setPassengerNames]  = useState<string[]>(
    Array.from({ length: totalPassengers }, () => "")
  );
  const [specialRequests, setSpecialRequests] = useState("");
  const [termsAccepted,   setTermsAccepted]   = useState(false);
  const [dataConsent,     setDataConsent]     = useState(false);
  const [submitting,      setSubmitting]      = useState(false);
  const [submitError,     setSubmitError]     = useState("");
  const [errors,          setErrors]          = useState<Record<string, string>>({});

  function updatePassengerName(i: number, v: string) {
    setPassengerNames((p) => { const n = [...p]; n[i] = v; return n; });
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!firstName.trim())               e.firstName = "First name is required";
    if (!lastName.trim())                e.lastName  = "Last name is required";
    if (!email.trim())                   e.email     = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Please enter a valid email";
    if (!phone.trim())                   e.phone     = "Phone number is required";
    passengerNames.forEach((n, i) => {
      if (!n.trim()) e[`pax_${i}`] = `Passenger ${i + 1} name is required`;
    });
    if (!termsAccepted) e.terms   = "You must accept the terms and conditions";
    if (!dataConsent)   e.consent = "You must consent to data processing";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) { toast.error("Please fill in all required fields."); return; }

    setSubmitError("");
    setSubmitting(true);
    try {
      const payload: BookingRequestSubmit = {
        first_name:       firstName.trim(),
        last_name:        lastName.trim(),
        email:            email.trim(),
        phone:            phone.trim(),
        flight_id:        flight.id,
        flight_number:    outbound.flight_number,
        origin:           searchParams.originLabel,
        destination:      searchParams.destinationLabel,
        departure_date:   dep.date,
        return_date:      searchParams.returnDate
                            ? formatDateTime(flight.legs[1]?.departure ?? "").date
                            : undefined,
        airline:          outbound.carriers[0] ?? "Unknown",
        price:            flight.price,
        currency:         flight.currency,
        cabin_class:      searchParams.cabinClass,
        num_passengers:   totalPassengers,
        passenger_names:  passengerNames.map((n) => n.trim()),
        special_requests: specialRequests.trim() || undefined,
        terms_accepted:   termsAccepted,
        data_consent:     dataConsent,
      };
      const response = await submitBookingRequest(payload);
      onSuccess(response, payload);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Submission failed. Please try again.";
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  function fieldCls(key: string) {
    return `w-full px-4 py-3 border-2 rounded-xl text-sm focus:outline-none transition-all ${
      errors[key]
        ? "border-red-300 focus:border-red-400 bg-red-50"
        : "border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
    }`;
  }

  function Err({ name }: { name: string }) {
    if (!errors[name]) return null;
    return (
      <p className="flex items-center gap-1 text-red-500 text-xs mt-1">
        <AlertCircle className="w-3 h-3 shrink-0" />{errors[name]}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">

      {/* Flight summary (read-only) */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-bold text-blue-900">{outbound.carriers[0]}</p>
            <p className="text-sm font-mono text-blue-600">{outbound.flight_number}</p>
          </div>
          <p className="text-2xl font-extrabold text-blue-900">{formatPrice(flight.price, flight.currency)}</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div>
            <p className="text-2xl font-bold text-slate-900">{dep.time}</p>
            <p className="text-xs font-bold text-blue-700">{outbound.origin}</p>
            <p className="text-xs text-slate-500">{outbound.origin_city}</p>
          </div>
          <div className="flex-1 text-center text-xs text-slate-400">
            <p>{formatDuration(outbound.duration_minutes)}</p>
            <div className="h-px bg-slate-300 my-1"></div>
            <p>{getStopsLabel(outbound.stops)}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-900">{arr.time}</p>
            <p className="text-xs font-bold text-blue-700">{outbound.destination}</p>
            <p className="text-xs text-slate-500">{outbound.destination_city}</p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-blue-100 flex gap-4 text-xs text-slate-500">
          <span>{dep.date}</span>
          <span className="text-slate-300">·</span>
          <span>{getCabinLabel(searchParams.cabinClass)}</span>
          <span className="text-slate-300">·</span>
          <span>{generatePassengerLabel(searchParams.adults, searchParams.children, searchParams.infants)}</span>
        </div>
      </div>

      {/* ── Personal Information ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-blue-600" /> Personal Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              First Name <span className="text-red-500">*</span>
            </label>
            <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
              placeholder="John" className={fieldCls("firstName")} />
            <Err name="firstName" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
              placeholder="Smith" className={fieldCls("lastName")} />
            <Err name="lastName" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Email Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com" className={`${fieldCls("email")} pl-10`} />
            </div>
            <Err name="email" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555 000 0000" className={`${fieldCls("phone")} pl-10`} />
            </div>
            <Err name="phone" />
          </div>
        </div>
      </div>

      {/* ── Travel Information ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" /> Travel Information
        </h3>
        <div className="bg-slate-50 rounded-xl px-4 py-3 mb-4 flex justify-between items-center">
          <span className="text-sm font-medium text-slate-700">Number of Passengers</span>
          <span className="text-lg font-extrabold text-blue-800">{totalPassengers}</span>
        </div>
        <div className="space-y-3 mb-5">
          <label className="block text-sm font-semibold text-slate-700">
            Passenger Names <span className="text-red-500">*</span>
          </label>
          {passengerNames.map((name, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-blue-700">{i + 1}</span>
              </div>
              <div className="flex-1">
                <input type="text" value={name}
                  onChange={(e) => updatePassengerName(i, e.target.value)}
                  placeholder={`Passenger ${i + 1} — full name as on passport`}
                  className={fieldCls(`pax_${i}`)} />
                <Err name={`pax_${i}`} />
              </div>
            </div>
          ))}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-slate-400" />
            Special Requests <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <textarea value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)}
            rows={3} placeholder="Dietary requirements, wheelchair assistance, seat preferences…"
            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all resize-none" />
        </div>
      </div>

      {/* ── Consent ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-blue-600" /> Consent
        </h3>
        {/* Terms */}
        <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all mb-3 ${
          termsAccepted ? "border-blue-300 bg-blue-50" : errors.terms ? "border-red-200 bg-red-50" : "border-slate-200 hover:border-slate-300"
        }`}>
          <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-blue-700 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-slate-800">Accept Terms &amp; Conditions</p>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              I agree to the{" "}
              <a href="#" className="text-blue-600 underline" onClick={(e) => e.stopPropagation()}>terms and conditions</a>.{" "}
              No payment is collected at this stage.
            </p>
          </div>
        </label>
        {errors.terms && <p className="flex items-center gap-1 text-red-500 text-xs mb-3 ml-1"><AlertCircle className="w-3 h-3" />{errors.terms}</p>}

        {/* Data consent */}
        <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
          dataConsent ? "border-blue-300 bg-blue-50" : errors.consent ? "border-red-200 bg-red-50" : "border-slate-200 hover:border-slate-300"
        }`}>
          <input type="checkbox" checked={dataConsent} onChange={(e) => setDataConsent(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-blue-700 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-slate-800">Data Processing Consent</p>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              I consent to my data being processed solely to handle this booking request, per the{" "}
              <a href="#" className="text-blue-600 underline" onClick={(e) => e.stopPropagation()}>privacy policy</a>.
            </p>
          </div>
        </label>
        {errors.consent && <p className="flex items-center gap-1 text-red-500 text-xs mt-2 ml-1"><AlertCircle className="w-3 h-3" />{errors.consent}</p>}
      </div>

      {/* Submit */}
      <ErrorAlert message={submitError} onDismiss={() => setSubmitError("")} className="mb-2" />
      <button type="submit" disabled={submitting}
        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-base shadow-lg hover:shadow-xl transition-all disabled:opacity-70 flex items-center justify-center gap-2 active:scale-[0.99]">
        {submitting
          ? <><Loader2 className="w-5 h-5 animate-spin" /> Submitting…</>
          : "Submit Booking Request"}
      </button>
    </form>
  );
}
