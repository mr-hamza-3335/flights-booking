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

// ── Response interceptor: normalise ALL errors before they reach callers ──────
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const message = extractErrorMessage(error);
    return Promise.reject(new Error(message));
  }
);

// ── Status-code → friendly message ───────────────────────────────────────────
const STATUS_MESSAGES: Record<number, string> = {
  400: "Invalid request. Please check your input.",
  401: "Incorrect email or password.",
  403: "You are not authorized to perform this action.",
  404: "The requested resource was not found.",
  429: "Too many requests. Please wait a moment and try again.",
  500: "Server error. Please try again later.",
  502: "Service unavailable. Please try again later.",
  503: "Service temporarily unavailable. Please try again later.",
};

export function mapHttpError(status: number): string {
  return STATUS_MESSAGES[status] ?? "Something went wrong. Please try again.";
}

function extractErrorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    // No response at all → network / connectivity problem
    if (!err.response) {
      return "Check your internet connection.";
    }

    const { status, data } = err.response;

    // New backend envelope: { success: false, message: "..." }
    if (data?.message && typeof data.message === "string") {
      return data.message;
    }

    // Legacy backend envelope: { error: { message: "..." } }
    if (data?.error?.message && typeof data.error.message === "string") {
      return data.error.message;
    }

    // FastAPI default: { detail: "..." | [...] }
    if (data?.detail) {
      if (typeof data.detail === "string") return data.detail;
      if (Array.isArray(data.detail)) {
        return data.detail.map((d: { msg?: string }) => d.msg).join(", ");
      }
    }

    // Fall back to status-code table
    return STATUS_MESSAGES[status] ?? "Something went wrong. Please try again.";
  }

  if (err instanceof Error) return err.message;
  return "Something went wrong. Please try again.";
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
