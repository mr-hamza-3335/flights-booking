"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BookingRequestResponse, BookingRequestSubmit } from "@/types";
import { getSelectedFlight, getSearchParams, savePendingOtp, saveBookingPayload } from "@/lib/session";
import BookingForm from "@/components/booking/BookingForm";

export default function BookingPage() {
  const router = useRouter();

  const flight       = getSelectedFlight();
  const searchParams = getSearchParams();

  useEffect(() => {
    if (!flight || !searchParams) {
      router.replace("/results");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!flight || !searchParams) return null;

  function handleSuccess(response: BookingRequestResponse, payload: BookingRequestSubmit) {
    // Save the form data for the success page to display later
    saveBookingPayload(payload);
    // Save pending OTP data for the verify-otp page
    savePendingOtp({
      request_id: response.request_id,
      email: response.email,
      first_name: payload.first_name,
    });
    router.push("/verify-otp");
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        type="button"
        onClick={() => router.push("/results")}
        className="flex items-center gap-2 text-slate-500 hover:text-blue-700 text-sm font-medium mb-6 transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to results
      </button>

      <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-6">
        Complete Your Booking Request
      </h1>

      <BookingForm
        flight={flight}
        searchParams={searchParams}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
