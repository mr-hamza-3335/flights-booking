import axios, { AxiosError } from "axios";
import {
  AdminBooking,
  AdminStats,
  AdminUser,
  DailyStat,
  AlertOut,
  AuthUser,
  BookingDetail,
  BookingRequestResponse,
  BookingRequestSubmit,
  BookingSummary,
  BookingTrackResponse,
  FlightItinerary,
  LoginPayload,
  OtpVerifyPayload,
  OtpVerifyResponse,
  ProfileUpdatePayload,
  ResendOtpPayload,
  SavedFlightOut,
  SearchParams,
  SignupPayload,
  TokenResponse,
  Airport,
} from "@/types";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api",
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

// ── JWT interceptor ───────────────────────────────────────────────────────────
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("sr_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

function extractErrorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const detail = err.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) return detail.map((d: { msg?: string }) => d.msg).join(", ");
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return "An unexpected error occurred";
}

// ── Flight endpoints ──────────────────────────────────────────────────────────

export async function searchAirports(query: string): Promise<Airport[]> {
  try {
    const { data } = await api.get<Airport[]>("/airports/search", { params: { q: query } });
    return data;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}

export async function searchFlights(params: SearchParams): Promise<FlightItinerary[]> {
  try {
    const { data } = await api.post<FlightItinerary[]>("/search-flights", {
      origin_sky_id:         params.originSkyId,
      origin_entity_id:      params.originEntityId,
      destination_sky_id:    params.destinationSkyId,
      destination_entity_id: params.destinationEntityId,
      date:                  params.date,
      return_date:           params.returnDate || null,
      adults:                params.adults,
      children:              params.children,
      infants:               params.infants,
      cabin_class:           params.cabinClass,
    });
    return data;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}

export async function getFlightDetails(flightId: string): Promise<FlightItinerary> {
  try {
    const { data } = await api.get<FlightItinerary>("/flight-details", {
      params: { flight_id: flightId },
    });
    return data;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}

export async function submitBookingRequest(
  payload: BookingRequestSubmit
): Promise<BookingRequestResponse> {
  try {
    const { data } = await api.post<BookingRequestResponse>("/booking-request", payload);
    return data;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}

export async function verifyOtp(payload: OtpVerifyPayload): Promise<OtpVerifyResponse> {
  try {
    const { data } = await api.post<OtpVerifyResponse>("/verify-otp", payload);
    return data;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}

export async function resendOtp(request_id: number): Promise<{ message: string; otp_sent: boolean }> {
  try {
    const payload: ResendOtpPayload = { request_id };
    const { data } = await api.post<{ message: string; otp_sent: boolean }>("/resend-otp", payload);
    return data;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}

// ── Auth endpoints ────────────────────────────────────────────────────────────

export async function signup(payload: SignupPayload): Promise<TokenResponse> {
  try {
    const { data } = await api.post<TokenResponse>("/auth/signup", payload);
    return data;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}

export async function login(payload: LoginPayload): Promise<TokenResponse> {
  try {
    const { data } = await api.post<TokenResponse>("/auth/login", payload);
    return data;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}

export async function getMe(): Promise<AuthUser> {
  try {
    const { data } = await api.get<AuthUser>("/auth/me");
    return data;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}

export async function updateProfile(payload: ProfileUpdatePayload): Promise<AuthUser> {
  try {
    const { data } = await api.put<AuthUser>("/auth/profile", payload);
    return data;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}

// ── User dashboard endpoints ──────────────────────────────────────────────────

export async function getMyBookings(): Promise<BookingSummary[]> {
  try {
    const { data } = await api.get<BookingSummary[]>("/users/bookings");
    return data;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}

export async function getMyBooking(referenceId: string): Promise<BookingDetail> {
  try {
    const { data } = await api.get<BookingDetail>(`/users/bookings/${referenceId}`);
    return data;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}

export async function getSavedFlights(): Promise<SavedFlightOut[]> {
  try {
    const { data } = await api.get<SavedFlightOut[]>("/users/saved-flights");
    return data;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}

export async function saveFlight(
  flightData: FlightItinerary,
  notes?: string
): Promise<SavedFlightOut> {
  try {
    const { data } = await api.post<SavedFlightOut>("/users/saved-flights", {
      flight_data: flightData,
      notes,
    });
    return data;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}

export async function deleteSavedFlight(id: number): Promise<void> {
  try {
    await api.delete(`/users/saved-flights/${id}`);
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}

export async function getAlerts(): Promise<AlertOut[]> {
  try {
    const { data } = await api.get<AlertOut[]>("/users/alerts");
    return data;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}

export async function createAlert(payload: {
  origin: string;
  destination: string;
  origin_label: string;
  destination_label: string;
  target_price: number;
}): Promise<AlertOut> {
  try {
    const { data } = await api.post<AlertOut>("/users/alerts", payload);
    return data;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}

export async function deleteAlert(id: number): Promise<void> {
  try {
    await api.delete(`/users/alerts/${id}`);
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}

export async function cancelBooking(referenceId: string): Promise<{ message: string; reference_id: string }> {
  try {
    const { data } = await api.delete(`/users/bookings/${referenceId}`);
    return data;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}

export async function trackBooking(referenceId: string): Promise<BookingTrackResponse> {
  try {
    const { data } = await api.get<BookingTrackResponse>(`/track/${referenceId}`);
    return data;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}

// ── Admin endpoints ───────────────────────────────────────────────────────────

export async function getAdminDailyStats(days = 30): Promise<DailyStat[]> {
  try {
    const { data } = await api.get<DailyStat[]>("/admin/stats/daily", { params: { days } });
    return data;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}

export async function getAdminStats(): Promise<AdminStats> {
  try {
    const { data } = await api.get<AdminStats>("/admin/stats");
    return data;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}

export async function getAdminBooking(bookingId: number): Promise<AdminBooking> {
  try {
    const { data } = await api.get<AdminBooking>(`/admin/bookings/${bookingId}`);
    return data;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}

export async function getAdminBookings(params?: {
  q?: string;
  status?: string;
  skip?: number;
  limit?: number;
}): Promise<AdminBooking[]> {
  try {
    const { data } = await api.get<AdminBooking[]>("/admin/bookings", { params });
    return data;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}

export async function updateBookingStatus(
  bookingId: number,
  status: string
): Promise<AdminBooking> {
  try {
    const { data } = await api.put<AdminBooking>(`/admin/bookings/${bookingId}/status`, { status });
    return data;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}

export async function getAdminUsers(params?: {
  q?: string;
  skip?: number;
  limit?: number;
}): Promise<AdminUser[]> {
  try {
    const { data } = await api.get<AdminUser[]>("/admin/users", { params });
    return data;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}

export async function sendAdminEmail(
  bookingId: number,
  message: string = ""
): Promise<{ sent: boolean; to: string; reference_id: string }> {
  try {
    const { data } = await api.post(`/admin/bookings/${bookingId}/email`, { message });
    return data;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}

export async function deleteAdminUser(userId: number): Promise<void> {
  try {
    await api.delete(`/admin/users/${userId}`);
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}

export async function updateUserRole(
  userId: number,
  payload: { role?: "user" | "admin"; is_active?: boolean }
): Promise<AdminUser> {
  try {
    const { data } = await api.put<AdminUser>(`/admin/users/${userId}/role`, payload);
    return data;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}
