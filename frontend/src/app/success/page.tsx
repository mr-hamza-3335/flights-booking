"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getBookingResponse, getBookingPayload, clearSession } from "@/lib/session";
import SuccessMessage from "@/components/request/SuccessMessage";

export default function SuccessPage() {
  const router = useRouter();

  const response = getBookingResponse();
  const payload  = getBookingPayload();

  useEffect(() => {
    if (!response || !payload) {
      router.replace("/");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!response || !payload) return null;

  function handleSearchAgain() {
    clearSession();
    router.push("/");
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <SuccessMessage
        response={response}
        booking={payload}
        onSearchAgain={handleSearchAgain}
      />
    </div>
  );
}
