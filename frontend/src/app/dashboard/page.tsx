"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plane, Bell, Bookmark, User, Clock, CheckCircle2,
  Phone, XCircle, Loader2, Trash2, ChevronRight, Mail, Ban,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  getMyBookings, getSavedFlights, getAlerts,
  deleteSavedFlight, deleteAlert, updateProfile, cancelBooking,
} from "@/lib/api";
import { BookingSummary, SavedFlightOut, AlertOut } from "@/types";
import toast from "react-hot-toast";
import ErrorAlert from "@/components/ErrorAlert";

type Tab = "bookings" | "saved" | "alerts" | "profile";

const STATUS_STYLES: Record<string, string> = {
  new:       "bg-yellow-100 text-yellow-700",
  pending:   "bg-yellow-100 text-yellow-700",
  contacted: "bg-blue-100 text-blue-700",
  confirmed: "bg-emerald-100 text-emerald-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-600",
};

const STATUS_LABEL_MAP: Record<string, string> = {
  new:       "New",
  pending:   "New",
  contacted: "Contacted",
  confirmed: "Confirmed",
  completed: "Confirmed",
  cancelled: "Cancelled",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  new:       <Clock className="w-3.5 h-3.5" />,
  pending:   <Clock className="w-3.5 h-3.5" />,
  contacted: <Phone className="w-3.5 h-3.5" />,
  confirmed: <CheckCircle2 className="w-3.5 h-3.5" />,
  completed: <CheckCircle2 className="w-3.5 h-3.5" />,
  cancelled: <XCircle className="w-3.5 h-3.5" />,
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, refreshUser } = useAuth();
  const [tab, setTab] = useState<Tab>("bookings");

  const [bookings, setBookings] = useState<BookingSummary[]>([]);
  const [saved, setSaved] = useState<SavedFlightOut[]>([]);
  const [alerts, setAlerts] = useState<AlertOut[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const [loadError, setLoadError] = useState("");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState({ first_name: "", last_name: "", phone: "" });
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/auth/login");
    }
    if (user) {
      setProfileForm({
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone || "",
      });
    }
  }, [user, authLoading, router]);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoadingData(true);
    try {
      const [b, s, a] = await Promise.all([getMyBookings(), getSavedFlights(), getAlerts()]);
      setBookings(b);
      setSaved(s);
      setAlerts(a);
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : "Failed to load your data. Please try again.");
    } finally {
      setLoadingData(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleDeleteSaved(id: number) {
    await deleteSavedFlight(id);
    setSaved((prev) => prev.filter((s) => s.id !== id));
    toast.success("Removed from saved flights");
  }

  async function handleDeleteAlert(id: number) {
    await deleteAlert(id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    toast.success("Alert removed");
  }

  async function handleCancelBooking(referenceId: string) {
    if (!confirm("Are you sure you want to cancel this booking request?")) return;
    setCancellingId(referenceId);
    try {
      await cancelBooking(referenceId);
      setBookings((prev) =>
        prev.map((b) =>
          b.reference_id === referenceId ? { ...b, status: "cancelled" as const } : b
        )
      );
      toast.success("Booking cancelled");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not cancel booking");
    } finally {
      setCancellingId(null);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateProfile(profileForm);
      await refreshUser();
      toast.success("Profile updated!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Update failed";
      toast.error(msg);
    } finally {
      setSavingProfile(false);
    }
  }

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const TABS: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: "bookings", label: "My Bookings",    icon: <Plane className="w-4 h-4" />,    count: bookings.length },
    { id: "saved",    label: "Saved Flights",  icon: <Bookmark className="w-4 h-4" />, count: saved.length },
    { id: "alerts",   label: "Price Alerts",   icon: <Bell className="w-4 h-4" />,     count: alerts.filter(a => a.is_active).length },
    { id: "profile",  label: "Profile",        icon: <User className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">
          Welcome back, {user.first_name}!
        </h1>
        <p className="text-slate-500 text-sm mt-1">{user.email}</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">

        {/* Sidebar tabs */}
        <aside className="lg:w-56 flex-shrink-0">
          <nav className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center justify-between w-full px-4 py-3.5 text-sm font-medium transition-colors border-b border-slate-50 last:border-0 ${
                  tab === t.id
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  {t.icon}
                  {t.label}
                </span>
                {t.count !== undefined && t.count > 0 && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    tab === t.id ? "bg-blue-200 text-blue-800" : "bg-slate-100 text-slate-500"
                  }`}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">

          <ErrorAlert
            message={loadError}
            onRetry={() => { setLoadError(""); loadData(); }}
            onDismiss={() => setLoadError("")}
            className="mb-4"
          />

          {/* ── Bookings ── */}
          {tab === "bookings" && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-800">My Booking Requests</h2>
              {loadingData ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
              ) : bookings.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
                  <Plane className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">No booking requests yet</p>
                  <Link href="/" className="mt-4 inline-flex items-center gap-1.5 text-blue-600 text-sm font-medium hover:underline">
                    Search flights <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              ) : (
                bookings.map((b) => (
                  <div key={b.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm font-bold text-blue-700">{b.reference_id}</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[b.status] ?? "bg-slate-100 text-slate-600"}`}>
                            {STATUS_ICONS[b.status]}
                            {STATUS_LABEL_MAP[b.status] ?? b.status}
                          </span>
                        </div>
                        <p className="font-semibold text-slate-800">
                          {b.origin} → {b.destination}
                        </p>
                        <p className="text-sm text-slate-500 mt-0.5">
                          {b.airline} · {b.flight_number} · {b.departure_date}
                          {b.return_date && ` — ${b.return_date}`}
                        </p>
                        <p className="text-sm text-slate-500">
                          {b.num_passengers} passenger{b.num_passengers !== 1 ? "s" : ""} · {b.cabin_class}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0 flex flex-col items-end gap-1.5">
                        <p className="text-lg font-bold text-sky-600">
                          {b.currency} {b.price.toLocaleString()}
                        </p>
                        <p className="text-xs text-slate-400">
                          {new Date(b.created_at).toLocaleDateString()}
                        </p>
                        {b.email_sent && (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                            <Mail className="w-3 h-3" /> Confirmed
                          </span>
                        )}
                        {b.cancelled_at && (
                          <p className="text-xs text-red-400">
                            Cancelled {new Date(b.cancelled_at).toLocaleDateString()}
                          </p>
                        )}
                        {(b.status === "new" || b.status === "pending" || b.status === "contacted") && (
                          <button
                            onClick={() => handleCancelBooking(b.reference_id)}
                            disabled={cancellingId === b.reference_id}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium text-red-500 border border-red-200 hover:bg-red-50 disabled:opacity-50 transition-colors"
                          >
                            {cancellingId === b.reference_id
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <Ban className="w-3 h-3" />
                            }
                            Cancel Request
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── Saved Flights ── */}
          {tab === "saved" && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-800">Saved Flights</h2>
              {loadingData ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
              ) : saved.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
                  <Bookmark className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">No saved flights</p>
                  <p className="text-xs text-slate-400 mt-1">Save flights from search results to view them later.</p>
                </div>
              ) : (
                saved.map((s) => {
                  const leg = s.flight_data?.legs?.[0];
                  return (
                    <div key={s.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          {leg && (
                            <p className="font-semibold text-slate-800">
                              {leg.origin} → {leg.destination}
                            </p>
                          )}
                          <p className="text-sm text-slate-500 mt-0.5">
                            {s.flight_data?.legs?.[0]?.carriers?.join(", ")} · {s.flight_data?.currency} {s.flight_data?.price?.toLocaleString()}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Saved {new Date(s.created_at).toLocaleDateString()}
                          </p>
                          {s.notes && (
                            <p className="text-sm text-slate-600 mt-1 italic">&ldquo;{s.notes}&rdquo;</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteSaved(s.id)}
                          className="p-2 rounded-xl text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ── Alerts ── */}
          {tab === "alerts" && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-800">Price Alerts</h2>
              {loadingData ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
              ) : alerts.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
                  <Bell className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">No price alerts</p>
                  <p className="text-xs text-slate-400 mt-1">Set alerts from flight results to get notified of price drops.</p>
                </div>
              ) : (
                alerts.map((a) => (
                  <div key={a.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-800">
                          {a.origin_label || a.origin} → {a.destination_label || a.destination}
                        </p>
                        <p className="text-sm text-slate-500 mt-0.5">
                          Target: <span className="font-semibold text-sky-600">USD {a.target_price.toLocaleString()}</span>
                        </p>
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium mt-1 ${
                          a.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                        }`}>
                          {a.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteAlert(a.id)}
                        className="p-2 rounded-xl text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── Profile ── */}
          {tab === "profile" && (
            <div>
              <h2 className="text-lg font-semibold text-slate-800 mb-4">Profile Information</h2>
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">First Name</label>
                      <input
                        type="text" required
                        value={profileForm.first_name}
                        onChange={(e) => setProfileForm((p) => ({ ...p, first_name: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Last Name</label>
                      <input
                        type="text" required
                        value={profileForm.last_name}
                        onChange={(e) => setProfileForm((p) => ({ ...p, last_name: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
                    <input
                      type="email" disabled value={user.email}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-slate-400 text-sm cursor-not-allowed"
                    />
                    <p className="text-xs text-slate-400 mt-1">Email address cannot be changed.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone Number</label>
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
                      placeholder="+1 555 000 0000"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="px-6 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold text-sm transition-colors flex items-center gap-2"
                    >
                      {savingProfile && <Loader2 className="w-4 h-4 animate-spin" />}
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
