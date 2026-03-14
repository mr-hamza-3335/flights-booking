/**
 * session.ts
 * ──────────
 * Thin wrapper around sessionStorage for passing state between pages.
 * All data is serialised to JSON and stored under namespaced keys.
 * Gracefully returns null when sessionStorage is unavailable (SSR).
 */

import {
  BookingRequestSubmit,
  FlightItinerary,
  OtpVerifyResponse,
  PendingOtpSession,
  SearchParams,
} from "@/types";

const KEYS = {
  searchParams:    "sr:searchParams",
  flights:         "sr:flights",
  selectedFlight:  "sr:selectedFlight",
  bookingPayload:  "sr:bookingPayload",
  bookingResponse: "sr:bookingResponse",
  pendingOtp:      "sr:pendingOtp",
} as const;

// ── Low-level helpers ──────────────────────────────────────────────────────

function write<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage quota exceeded — fail silently
  }
}

function read<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function remove(...keys: string[]): void {
  if (typeof window === "undefined") return;
  keys.forEach((k) => sessionStorage.removeItem(k));
}

// ── Search session ─────────────────────────────────────────────────────────

export function saveSearchSession(params: SearchParams, flights: FlightItinerary[]): void {
  write(KEYS.searchParams, params);
  write(KEYS.flights, flights);
}

export function getSearchParams(): SearchParams | null {
  return read<SearchParams>(KEYS.searchParams);
}

export function getFlights(): FlightItinerary[] {
  return read<FlightItinerary[]>(KEYS.flights) ?? [];
}

// ── Selected flight ────────────────────────────────────────────────────────

export function saveSelectedFlight(flight: FlightItinerary): void {
  write(KEYS.selectedFlight, flight);
}

export function getSelectedFlight(): FlightItinerary | null {
  return read<FlightItinerary>(KEYS.selectedFlight);
}

// ── Pending OTP session (set after booking form submit) ───────────────────

export function savePendingOtp(data: PendingOtpSession): void {
  write(KEYS.pendingOtp, data);
}

export function getPendingOtp(): PendingOtpSession | null {
  return read<PendingOtpSession>(KEYS.pendingOtp);
}

// ── Booking payload (form data, needed for success page display) ──────────

export function saveBookingPayload(payload: BookingRequestSubmit): void {
  write(KEYS.bookingPayload, payload);
}

export function getBookingPayload(): BookingRequestSubmit | null {
  return read<BookingRequestSubmit>(KEYS.bookingPayload);
}

// ── Verified booking response (set after OTP verification) ────────────────

export function saveBookingResponse(response: OtpVerifyResponse): void {
  write(KEYS.bookingResponse, response);
}

export function getBookingResponse(): OtpVerifyResponse | null {
  return read<OtpVerifyResponse>(KEYS.bookingResponse);
}

// ── Clear ──────────────────────────────────────────────────────────────────

export function clearSession(): void {
  remove(...Object.values(KEYS));
}

export function clearBookingSession(): void {
  remove(KEYS.bookingPayload, KEYS.bookingResponse, KEYS.pendingOtp);
}
