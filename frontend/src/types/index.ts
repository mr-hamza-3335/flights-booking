export interface Airport {
  skyId: string;
  entityId: string;
  name: string;
  city: string;
  country: string;
  iata: string;
  type: string;
}

export interface Leg {
  id: string;
  flight_number: string;
  origin: string;
  origin_city: string;
  destination: string;
  destination_city: string;
  departure: string;
  arrival: string;
  duration_minutes: number;
  stops: number;
  carriers: string[];
  carrier_logos: string[];
}

export interface FlightItinerary {
  id: string;
  price: number;
  currency: string;
  legs: Leg[];
  score: number | null;
  tags: string[];
  deeplink: string | null;
}

export interface SearchParams {
  originSkyId: string;
  originEntityId: string;
  destinationSkyId: string;
  destinationEntityId: string;
  originLabel: string;
  destinationLabel: string;
  date: string;
  returnDate?: string;
  adults: number;
  children: number;
  infants: number;
  cabinClass: string;
}

export interface BookingRequestSubmit {
  // Personal
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  // Flight
  flight_id: string;
  flight_number: string;
  origin: string;
  destination: string;
  departure_date: string;
  return_date?: string;
  airline: string;
  price: number;
  currency: string;
  cabin_class: string;
  // Travel
  num_passengers: number;
  passenger_names: string[];
  special_requests?: string;
  // Consent
  terms_accepted: boolean;
  data_consent: boolean;
}

/** Returned immediately after booking form submission (OTP sent, not yet verified). */
export interface BookingRequestResponse {
  request_id: number;
  email: string;
  otp_sent: boolean;
  message: string;
}

/** Returned after successful OTP verification — booking is confirmed. */
export interface OtpVerifyResponse {
  success: boolean;
  message: string;
  reference_id: string;
  submitted_at: string;
  email_sent: boolean;
}

export interface OtpVerifyPayload {
  request_id: number;
  otp_code: string;
}

export interface ResendOtpPayload {
  request_id: number;
}

export interface PendingOtpSession {
  request_id: number;
  email: string;
  first_name: string;
}

// ── Auth types ────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  role: "user" | "admin";
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export interface SignupPayload {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ProfileUpdatePayload {
  first_name?: string;
  last_name?: string;
  phone?: string;
}

// ── Dashboard types ───────────────────────────────────────────────────────────

export interface BookingSummary {
  id: number;
  reference_id: string;
  status: "new" | "pending" | "contacted" | "confirmed" | "completed" | "cancelled";
  origin: string;
  destination: string;
  airline: string;
  flight_number: string;
  departure_date: string;
  return_date: string | null;
  price: number;
  currency: string;
  cabin_class: string;
  num_passengers: number;
  email_sent: boolean;
  cancelled_at: string | null;
  created_at: string;
}

export interface BookingDetail extends BookingSummary {
  passenger_names: string[];
  special_requests: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

export interface SavedFlightOut {
  id: number;
  flight_data: FlightItinerary;
  notes: string | null;
  created_at: string;
}

export interface AlertOut {
  id: number;
  origin: string;
  destination: string;
  origin_label: string;
  destination_label: string;
  target_price: number;
  is_active: boolean;
  created_at: string;
}

// ── Admin types ───────────────────────────────────────────────────────────────

export interface AdminBooking {
  id: number;
  reference_id: string;
  status: string;
  status_label: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  origin: string;
  destination: string;
  airline: string;
  flight_number: string;
  departure_date: string;
  return_date: string | null;
  price: number;
  currency: string;
  cabin_class: string;
  num_passengers: number;
  passenger_names: string[];
  special_requests: string | null;
  email_sent: boolean;
  user_id: number | null;
  created_at: string;
}

export interface AdminUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  role: "user" | "admin";
  is_active: boolean;
  booking_count: number;
  created_at: string;
}

export interface AdminStats {
  total_bookings: number;
  new: number;
  contacted: number;
  confirmed: number;
  cancelled: number;
  total_users: number;
  email_sent_count: number;
}

export type BookingStatus = "new" | "pending" | "contacted" | "confirmed" | "completed" | "cancelled";

export interface DailyStat {
  day: string;   // YYYY-MM-DD
  count: number;
}

export interface BookingTrackResponse {
  reference_id: string;
  status: string;
  status_label: string;
  status_description: string;
  first_name: string;
  origin: string;
  destination: string;
  airline: string;
  flight_number: string;
  departure_date: string;
  return_date: string | null;
  num_passengers: number;
  cabin_class: string;
  created_at: string;
}
