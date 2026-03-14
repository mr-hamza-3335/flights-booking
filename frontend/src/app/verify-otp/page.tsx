"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  Plane,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { verifyOtp, resendOtp } from "@/lib/api";
import {
  getPendingOtp,
  getBookingPayload,
  saveBookingResponse,
  clearBookingSession,
} from "@/lib/session";
import { formatPrice, getCabinLabel } from "@/lib/utils";

const OTP_LENGTH = 6;
const TIMER_SECONDS = 5 * 60; // 5 minutes

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function VerifyOtpPage() {
  const router  = useRouter();
  const pending = getPendingOtp();
  const payload = getBookingPayload();

  // Redirect if there's no pending OTP session
  useEffect(() => {
    if (!pending || !payload) {
      router.replace("/");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── OTP input state ────────────────────────────────────────────────────────
  const [digits, setDigits]     = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const inputRefs               = useRef<(HTMLInputElement | null)[]>([]);

  // ── Countdown timer ────────────────────────────────────────────────────────
  const [timeLeft, setTimeLeft]   = useState(TIMER_SECONDS);
  const [expired, setExpired]     = useState(false);
  const timerRef                  = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    setTimeLeft(TIMER_SECONDS);
    setExpired(false);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setExpired(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [startTimer]);

  // ── Submit/resend state ───────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [resending,  setResending]  = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [success,    setSuccess]    = useState(false);

  // ── OTP input handlers ────────────────────────────────────────────────────

  function handleDigitChange(index: number, value: string) {
    // Allow only digits
    const clean = value.replace(/\D/g, "").slice(-1);
    const next  = [...digits];
    next[index] = clean;
    setDigits(next);
    setError(null);

    if (clean && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (digits[index]) {
        const next = [...digits];
        next[index] = "";
        setDigits(next);
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === "Enter") {
      handleSubmit();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!text) return;
    const next = Array(OTP_LENGTH).fill("");
    for (let i = 0; i < text.length; i++) next[i] = text[i];
    setDigits(next);
    setError(null);
    inputRefs.current[Math.min(text.length, OTP_LENGTH - 1)]?.focus();
  }

  // ── Verify ────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!pending) return;
    const code = digits.join("");
    if (code.length < OTP_LENGTH) {
      setError("Please enter all 6 digits.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const result = await verifyOtp({ request_id: pending.request_id, otp_code: code });
      saveBookingResponse(result);
      setSuccess(true);
      // Brief success animation, then navigate to success page
      setTimeout(() => router.push("/success"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.");
      // Clear digits on wrong OTP
      setDigits(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } finally {
      setSubmitting(false);
    }
  }

  // ── Resend OTP ────────────────────────────────────────────────────────────

  async function handleResend() {
    if (!pending) return;
    setError(null);
    setResending(true);
    try {
      await resendOtp(pending.request_id);
      setDigits(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
      startTimer();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend code.");
    } finally {
      setResending(false);
    }
  }

  if (!pending || !payload) return null;

  // ── Success overlay ───────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-sky-50">
        <div className="text-center animate-fade-in">
          <div className="flex justify-center mb-5">
            <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-14 h-14 text-emerald-500" strokeWidth={1.5} />
            </div>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Booking Confirmed!</h2>
          <p className="text-slate-500">Redirecting you to your confirmation…</p>
        </div>
      </div>
    );
  }

  const otpComplete = digits.every(Boolean);
  const urgentTime  = timeLeft > 0 && timeLeft <= 60;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50 flex flex-col items-center justify-center px-4 py-12">

      {/* ── Card ── */}
      <div className="w-full max-w-md">

        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <Plane className="w-6 h-6 text-blue-600" />
            <span className="text-xl font-extrabold text-blue-900">SkyRequest</span>
          </div>
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center">
              <ShieldCheck className="w-9 h-9 text-blue-600" />
            </div>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Verify your email</h1>
          <p className="text-slate-500 text-sm leading-relaxed">
            We sent a 6-digit code to
          </p>
          <p className="font-semibold text-blue-700 text-sm mt-1">{pending.email}</p>
        </div>

        {/* Main card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">

          {/* Countdown timer */}
          <div className={`flex items-center justify-center gap-2 mb-6 text-sm font-semibold rounded-xl py-2.5 px-4 ${
            expired
              ? "bg-red-50 text-red-600 border border-red-200"
              : urgentTime
              ? "bg-amber-50 text-amber-700 border border-amber-200"
              : "bg-slate-50 text-slate-600 border border-slate-200"
          }`}>
            <Clock className="w-4 h-4" />
            {expired
              ? "Code expired — please request a new one"
              : `Code expires in ${formatTime(timeLeft)}`}
          </div>

          {/* OTP digit inputs */}
          <div className="flex gap-3 justify-center mb-6">
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                disabled={submitting || expired}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={handlePaste}
                onClick={() => inputRefs.current[i]?.select()}
                className={`w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-extrabold rounded-xl border-2 outline-none transition-all
                  ${digit ? "border-blue-500 bg-blue-50 text-blue-900" : "border-slate-200 bg-slate-50 text-slate-900"}
                  ${error ? "border-red-400 bg-red-50" : ""}
                  ${submitting || expired ? "opacity-60 cursor-not-allowed" : "focus:border-blue-500 focus:ring-4 focus:ring-blue-100"}
                `}
              />
            ))}
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm text-center">
              {error}
            </div>
          )}

          {/* Verify button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !otpComplete || expired}
            className="w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all
              bg-gradient-to-r from-blue-600 to-sky-500
              hover:from-blue-700 hover:to-sky-600
              disabled:opacity-50 disabled:cursor-not-allowed
              active:scale-[0.99] shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Verifying…
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                Confirm Booking
              </>
            )}
          </button>

          {/* Resend */}
          <div className="mt-5 text-center">
            <p className="text-slate-500 text-sm mb-2">Didn&apos;t receive the code?</p>
            <button
              type="button"
              onClick={handleResend}
              disabled={resending || submitting || (!expired && timeLeft > 0)}
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800
                disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
            >
              {resending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {resending ? "Sending…" : "Resend code"}
            </button>
            {!expired && timeLeft > 0 && (
              <p className="text-xs text-slate-400 mt-1">
                Available after the timer expires
              </p>
            )}
          </div>
        </div>

        {/* Flight summary card */}
        <div className="mt-4 bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200 p-5">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Plane className="w-3.5 h-3.5" /> Your Flight Summary
          </p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              { label: "Route",     value: `${payload.origin} → ${payload.destination}` },
              { label: "Airline",   value: payload.airline },
              { label: "Departure", value: payload.departure_date },
              { label: "Cabin",     value: getCabinLabel(payload.cabin_class) },
              { label: "Passengers",value: String(payload.num_passengers) },
              { label: "Price",     value: formatPrice(payload.price, payload.currency) },
            ].map(({ label, value }) => (
              <div key={label}>
                <span className="text-slate-400 text-xs">{label}</span>
                <p className="font-semibold text-slate-800 truncate">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Info note */}
        <div className="mt-4 flex items-start gap-2.5 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl">
          <Mail className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 leading-relaxed">
            Check your spam folder if you don&apos;t see the email. The code is valid for 5 minutes.
          </p>
        </div>
      </div>
    </div>
  );
}
