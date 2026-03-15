"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard, Plane, Users, ShieldCheck, Search,
  Loader2, X, Mail, Phone, User, Calendar, Tag,
  CheckCircle2, Clock, MessageCircle, XCircle, RefreshCw,
  ChevronRight, Ticket, ArrowRight, AlertCircle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  getAdminStats, getAdminBookings, getAdminUsers, getAdminDailyStats,
  updateBookingStatus, updateUserRole, sendAdminEmail, deleteAdminUser,
} from "@/lib/api";
import { AdminStats, AdminBooking, AdminUser, DailyStat } from "@/types";
import toast from "react-hot-toast";
import ErrorAlert from "@/components/ErrorAlert";

// ── Status config ─────────────────────────────────────────────────────────────

type Section = "dashboard" | "requests" | "users";

const STATUS_FILTERS = [
  { value: "",           label: "All",       color: "slate" },
  { value: "new",        label: "New",       color: "yellow" },
  { value: "contacted",  label: "Contacted", color: "blue"   },
  { value: "confirmed",  label: "Confirmed", color: "emerald"},
  { value: "cancelled",  label: "Cancelled", color: "red"    },
];

const STATUS_BADGE: Record<string, string> = {
  new:       "bg-yellow-100 text-yellow-700 border-yellow-200",
  pending:   "bg-yellow-100 text-yellow-700 border-yellow-200",
  contacted: "bg-blue-100 text-blue-700 border-blue-200",
  confirmed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-100 text-red-600 border-red-200",
};

const STATUS_LABEL: Record<string, string> = {
  new:       "New",
  pending:   "New",
  contacted: "Contacted",
  confirmed: "Confirmed",
  completed: "Confirmed",
  cancelled: "Cancelled",
};

const STATUS_ACTIONS = [
  { value: "new",       label: "New",       icon: Clock,          cls: "border-yellow-200 text-yellow-700 hover:bg-yellow-50" },
  { value: "contacted", label: "Contacted", icon: MessageCircle,  cls: "border-blue-200 text-blue-700 hover:bg-blue-50" },
  { value: "confirmed", label: "Confirmed", icon: CheckCircle2,   cls: "border-emerald-200 text-emerald-700 hover:bg-emerald-50" },
  { value: "cancelled", label: "Cancelled", icon: XCircle,        cls: "border-red-200 text-red-600 hover:bg-red-50" },
];

function getCabinLabel(cabin: string) {
  return { economy: "Economy", premium_economy: "Premium Economy", business: "Business", first: "First Class" }[cabin] ?? cabin;
}

// ── Booking detail drawer ─────────────────────────────────────────────────────

function BookingDrawer({
  booking,
  onClose,
  onStatusChange,
}: {
  booking: AdminBooking;
  onClose: () => void;
  onStatusChange: (id: number, status: string) => Promise<void>;
}) {
  const [updating,      setUpdating]      = useState(false);
  const [currentStatus, setCurrentStatus] = useState(booking.status);
  const [sendingEmail,  setSendingEmail]  = useState(false);
  const [emailMessage,  setEmailMessage]  = useState("");
  const [emailSent,     setEmailSent]     = useState<boolean | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  async function handleStatus(newStatus: string) {
    if (newStatus === currentStatus) return;
    setUpdating(true);
    try {
      await onStatusChange(booking.id, newStatus);
      setCurrentStatus(newStatus);
    } finally {
      setUpdating(false);
    }
  }

  async function handleSendEmail() {
    setSendingEmail(true);
    setEmailSent(null);
    try {
      const result = await sendAdminEmail(booking.id, emailMessage);
      setEmailSent(result.sent);
      if (result.sent) {
        toast.success(`Email sent to ${result.to}`);
        setEmailMessage("");
      } else {
        toast.error("Email delivery failed — check SMTP settings");
      }
    } catch {
      toast.error("Failed to send email");
      setEmailSent(false);
    } finally {
      setSendingEmail(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={drawerRef}
        className="absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl flex flex-col"
        style={{ animation: "slideInRight 0.2s ease-out" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-mono font-bold text-blue-700 text-lg tracking-wider">
                {booking.reference_id}
              </span>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_BADGE[currentStatus] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
                {STATUS_LABEL[currentStatus] ?? currentStatus}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Submitted {new Date(booking.created_at).toLocaleString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Status update */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
              Update Status
            </p>
            <div className="grid grid-cols-4 gap-2">
              {STATUS_ACTIONS.map(({ value, label, icon: Icon, cls }) => (
                <button
                  key={value}
                  disabled={updating}
                  onClick={() => handleStatus(value)}
                  className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border text-xs font-semibold transition-all disabled:opacity-50 ${
                    currentStatus === value || (value === "new" && currentStatus === "pending") || (value === "confirmed" && currentStatus === "completed")
                      ? "ring-2 ring-offset-1 " + cls.replace("hover:", "")
                      : cls
                  }`}
                >
                  {updating && (currentStatus !== value) ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                  {label}
                </button>
              ))}
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Customer */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Customer</p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 space-y-2.5">
              <Row label="Name"  value={`${booking.first_name} ${booking.last_name}`} bold />
              <Row label="Email" value={booking.email} href={`mailto:${booking.email}`} />
              <Row label="Phone" value={booking.phone} href={`tel:${booking.phone}`} />
            </div>
          </section>

          {/* Flight */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-sky-100 flex items-center justify-center">
                <Plane className="w-3.5 h-3.5 text-sky-600" />
              </div>
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Flight Details</p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 space-y-2.5">
              {/* Route visual */}
              <div className="flex items-center gap-2 mb-3 p-3 bg-white rounded-xl border border-slate-100">
                <div className="text-center flex-1">
                  <p className="text-xs text-slate-400">From</p>
                  <p className="font-bold text-slate-800 text-sm leading-tight mt-0.5">{booking.origin}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                <div className="text-center flex-1">
                  <p className="text-xs text-slate-400">To</p>
                  <p className="font-bold text-slate-800 text-sm leading-tight mt-0.5">{booking.destination}</p>
                </div>
              </div>
              <Row label="Airline"    value={booking.airline} bold />
              <Row label="Flight No." value={booking.flight_number} mono />
              <Row label="Departure"  value={booking.departure_date} />
              {booking.return_date && <Row label="Return" value={booking.return_date} />}
              <Row label="Cabin"      value={getCabinLabel(booking.cabin_class)} />
              <Row label="Passengers" value={`${booking.num_passengers} passenger${booking.num_passengers !== 1 ? "s" : ""}`} />
              <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                <span className="text-sm text-slate-500">Estimated Price</span>
                <span className="text-xl font-bold text-sky-600">
                  {booking.currency} {booking.price.toLocaleString()}
                </span>
              </div>
            </div>
          </section>

          {/* Passengers */}
          {booking.passenger_names.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg bg-violet-100 flex items-center justify-center">
                  <Users className="w-3.5 h-3.5 text-violet-600" />
                </div>
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Passengers ({booking.passenger_names.length})
                </p>
              </div>
              <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
                {booking.passenger_names.map((name, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium text-slate-700">{name}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Special requests */}
          {booking.special_requests && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Special Requests</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <p className="text-sm text-slate-700 leading-relaxed">{booking.special_requests}</p>
              </div>
            </section>
          )}

          {/* Meta */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center">
                <Tag className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Metadata</p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 space-y-2.5">
              <Row
                label="Email Confirmation"
                value={booking.email_sent ? "Sent" : "Not sent"}
                valueClass={booking.email_sent ? "text-emerald-600 font-semibold" : "text-amber-600 font-semibold"}
              />
              {booking.user_id && <Row label="User ID" value={`#${booking.user_id}`} mono />}
            </div>
          </section>

          {/* Send Email */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center">
                <Mail className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Send Email to Customer</p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
              <p className="text-xs text-slate-500 leading-relaxed">
                Send a status update email to <strong>{booking.email}</strong>.
                Leave the message blank to use a default message based on the current status.
              </p>
              <textarea
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                placeholder="Optional: add a personal message to the customer…"
                rows={3}
                className="w-full text-sm px-3 py-2.5 border border-slate-200 rounded-xl bg-white
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  resize-none placeholder:text-slate-400"
              />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSendEmail}
                  disabled={sendingEmail}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700
                    disabled:bg-blue-300 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  {sendingEmail ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Mail className="w-3.5 h-3.5" />
                  )}
                  {sendingEmail ? "Sending…" : "Send Email"}
                </button>
                {emailSent === true && (
                  <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Delivered
                  </span>
                )}
                {emailSent === false && !sendingEmail && (
                  <span className="text-xs text-red-600 font-semibold flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> Failed
                  </span>
                )}
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}

function Row({
  label, value, bold, mono, href, valueClass,
}: {
  label: string; value: string;
  bold?: boolean; mono?: boolean; href?: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-sm text-slate-400 shrink-0">{label}</span>
      {href ? (
        <a href={href} className={`text-sm text-right text-blue-600 hover:underline break-all ${bold ? "font-semibold" : ""} ${mono ? "font-mono" : ""}`}>
          {value}
        </a>
      ) : (
        <span className={`text-sm text-right break-all ${bold ? "font-bold text-slate-800" : "text-slate-700"} ${mono ? "font-mono" : ""} ${valueClass ?? ""}`}>
          {value}
        </span>
      )}
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon: Icon, bgClass, textClass, onClick, active,
}: {
  label: string; value: number;
  icon: React.ElementType; bgClass: string; textClass: string;
  onClick?: () => void; active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-white rounded-2xl border p-5 shadow-sm transition-all hover:shadow-md ${
        active ? "ring-2 ring-offset-2 ring-blue-500 border-blue-200" : "border-slate-100"
      }`}
    >
      <div className={`w-10 h-10 rounded-xl ${bgClass} flex items-center justify-center mb-4`}>
        <Icon className={`w-5 h-5 ${textClass}`} />
      </div>
      <p className="text-3xl font-bold text-slate-800 leading-none">{value}</p>
      <p className="text-sm text-slate-500 mt-1.5">{label}</p>
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [section, setSection] = useState<Section>("dashboard");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [recentBookings, setRecentBookings] = useState<AdminBooking[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);

  const [loadError, setLoadError] = useState("");
  const [loadingData, setLoadingData] = useState(false);
  const [bookingSearch, setBookingSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<AdminBooking | null>(null);

  // Auth guard
  useEffect(() => {
    if (!authLoading) {
      if (!user) { router.replace("/auth/login"); return; }
      if (user.role !== "admin") { router.replace("/dashboard"); return; }
    }
  }, [user, authLoading, router]);

  const loadStats = useCallback(async () => {
    try {
      const [s, recent, daily] = await Promise.all([
        getAdminStats(),
        getAdminBookings({ limit: 5 }),
        getAdminDailyStats(30),
      ]);
      setStats(s);
      setRecentBookings(recent);
      setDailyStats(daily);
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : "Failed to load dashboard data. Please try again.");
    }
  }, []);

  const loadBookings = useCallback(async () => {
    setLoadingData(true);
    setLoadError("");
    try {
      const data = await getAdminBookings({
        q: bookingSearch || undefined,
        status: statusFilter || undefined,
        limit: 100,
      });
      setBookings(data);
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : "Failed to load bookings. Please try again.");
    } finally {
      setLoadingData(false);
    }
  }, [bookingSearch, statusFilter]);

  const loadUsers = useCallback(async () => {
    setLoadingData(true);
    setLoadError("");
    try {
      const data = await getAdminUsers({ q: userSearch || undefined, limit: 100 });
      setUsers(data);
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : "Failed to load users. Please try again.");
    } finally {
      setLoadingData(false);
    }
  }, [userSearch]);

  useEffect(() => { if (user?.role === "admin") loadStats(); }, [user, loadStats]);
  useEffect(() => { if (section === "requests" && user?.role === "admin") loadBookings(); }, [section, loadBookings, user]);
  useEffect(() => { if (section === "users" && user?.role === "admin") loadUsers(); }, [section, loadUsers, user]);

  async function handleStatusChange(bookingId: number, newStatus: string) {
    try {
      const updated = await updateBookingStatus(bookingId, newStatus);
      const patch = (b: AdminBooking) =>
        b.id === bookingId ? { ...b, status: updated.status, status_label: updated.status_label } : b;
      setBookings((prev) => prev.map(patch));
      setRecentBookings((prev) => prev.map(patch));
      if (selectedBooking?.id === bookingId) {
        setSelectedBooking((prev) => prev ? patch(prev) : null);
      }
      toast.success(`Marked as ${updated.status_label}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function handleToggleAdmin(userId: number, currentRole: string) {
    try {
      const updated = await updateUserRole(userId, {
        role: currentRole === "admin" ? "user" : "admin",
      });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: updated.role } : u)));
      toast.success(`Role changed to ${updated.role}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function handleDeleteUser(userId: number, email: string) {
    if (!confirm(`Permanently delete user ${email}? This cannot be undone.`)) return;
    setDeletingUserId(userId);
    try {
      await deleteAdminUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      toast.success("User deleted");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingUserId(null);
    }
  }

  async function handleToggleActive(userId: number, isActive: boolean) {
    try {
      const updated = await updateUserRole(userId, { is_active: !isActive });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_active: updated.is_active } : u)));
      toast.success(updated.is_active ? "Account activated" : "Account deactivated");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  }

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const NAV = [
    { id: "dashboard" as Section, label: "Dashboard",   icon: LayoutDashboard },
    { id: "requests"  as Section, label: "Requests",    icon: Ticket,
      badge: stats ? stats.new : undefined },
    { id: "users"     as Section, label: "Users",       icon: Users,
      badge: stats?.total_users },
  ];

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">

      {/* ── Sidebar ── */}
      <aside className="w-56 flex-shrink-0 bg-[#0f172a] flex flex-col hidden lg:flex">
        {/* Brand */}
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Admin Panel</p>
              <p className="text-xs text-slate-400">SkyRequest</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ id, label, icon: Icon, badge }) => (
            <button
              key={id}
              onClick={() => setSection(id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                section === id
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-white/10"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Icon className="w-4 h-4" />
                {label}
              </span>
              {badge !== undefined && badge > 0 && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
                  section === id ? "bg-white/20 text-white" : "bg-yellow-500 text-white"
                }`}>
                  {badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* User info */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user.first_name[0]}{user.last_name[0]}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {user.first_name} {user.last_name}
              </p>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Mobile top tabs ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0f172a] flex border-t border-white/10">
        {NAV.map(({ id, label, icon: Icon, badge }) => (
          <button
            key={id}
            onClick={() => setSection(id)}
            className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium relative ${
              section === id ? "text-blue-400" : "text-slate-500"
            }`}
          >
            <Icon className="w-5 h-5" />
            {label}
            {badge !== undefined && badge > 0 && (
              <span className="absolute top-2 right-1/4 w-4 h-4 bg-yellow-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {badge > 9 ? "9+" : badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Main content ── */}
      <main className="flex-1 bg-slate-50 overflow-auto pb-20 lg:pb-0">

        <div className="max-w-5xl mx-auto px-6 pt-6">
          <ErrorAlert
            message={loadError}
            onRetry={() => {
              setLoadError("");
              if (section === "dashboard") loadStats();
              if (section === "requests") loadBookings();
              if (section === "users") loadUsers();
            }}
            onDismiss={() => setLoadError("")}
            className="mb-4"
          />
        </div>

        {/* ══ Dashboard ══ */}
        {section === "dashboard" && (
          <div className="max-w-5xl mx-auto px-6 py-8">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
              <p className="text-slate-500 text-sm mt-0.5">Overview of all booking activity</p>
            </div>

            {!stats ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            ) : (
              <>
                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
                  <StatCard
                    label="Total Requests" value={stats.total_bookings}
                    icon={Ticket} bgClass="bg-blue-100" textClass="text-blue-600"
                    onClick={() => setSection("requests")}
                  />
                  <StatCard
                    label="New" value={stats.new}
                    icon={Clock} bgClass="bg-yellow-100" textClass="text-yellow-600"
                    onClick={() => { setSection("requests"); setStatusFilter("new"); }}
                  />
                  <StatCard
                    label="Contacted" value={stats.contacted}
                    icon={Phone} bgClass="bg-sky-100" textClass="text-sky-600"
                    onClick={() => { setSection("requests"); setStatusFilter("contacted"); }}
                  />
                  <StatCard
                    label="Confirmed" value={stats.confirmed}
                    icon={CheckCircle2} bgClass="bg-emerald-100" textClass="text-emerald-600"
                    onClick={() => { setSection("requests"); setStatusFilter("confirmed"); }}
                  />
                  <StatCard
                    label="Cancelled" value={stats.cancelled}
                    icon={XCircle} bgClass="bg-red-100" textClass="text-red-500"
                    onClick={() => { setSection("requests"); setStatusFilter("cancelled"); }}
                  />
                </div>

                {/* Secondary stats */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                        <Users className="w-5 h-5 text-violet-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-slate-800">{stats.total_users}</p>
                        <p className="text-sm text-slate-500">Registered Users</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                        <Mail className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-slate-800">{stats.email_sent_count}</p>
                        <p className="text-sm text-slate-500">Emails Sent</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bookings per day chart */}
                {dailyStats.length > 0 && (() => {
                  const max = Math.max(...dailyStats.map((d) => d.count), 1);
                  return (
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm mb-8">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-bold text-slate-700">Bookings per Day</h2>
                        <span className="text-xs text-slate-400">Last 30 days</span>
                      </div>
                      <div className="flex items-end gap-0.5 h-20">
                        {dailyStats.map(({ day, count }) => (
                          <div
                            key={day}
                            className="flex-1 group relative flex flex-col justify-end"
                          >
                            <div
                              className="w-full rounded-t-sm transition-colors bg-blue-400 group-hover:bg-blue-600"
                              style={{ height: `${Math.max((count / max) * 100, count > 0 ? 6 : 1)}%` }}
                            />
                            {count > 0 && (
                              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
                                <div className="bg-slate-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg">
                                  {day.slice(5)}: {count}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between mt-1.5">
                        <span className="text-xs text-slate-400">{dailyStats[0]?.day?.slice(5)}</span>
                        <span className="text-xs text-slate-400">{dailyStats[dailyStats.length - 1]?.day?.slice(5)}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Recent bookings */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold text-slate-800">Recent Requests</h2>
                    <button
                      onClick={() => setSection("requests")}
                      className="flex items-center gap-1 text-sm text-blue-600 font-medium hover:underline"
                    >
                      View all <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  {recentBookings.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">
                      <Ticket className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-400 text-sm">No booking requests yet</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50">
                      {recentBookings.map((b) => (
                        <button
                          key={b.id}
                          onClick={() => { setSection("requests"); setSelectedBooking(b); }}
                          className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors text-left"
                        >
                          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <Plane className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-slate-800 text-sm">
                                {b.first_name} {b.last_name}
                              </p>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_BADGE[b.status] ?? ""}`}>
                                {b.status_label}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 truncate mt-0.5">
                              {b.origin} → {b.destination} · {b.airline}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-bold text-sky-600">
                              {b.currency} {b.price.toLocaleString()}
                            </p>
                            <p className="text-xs text-slate-400">
                              {new Date(b.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ══ Requests ══ */}
        {section === "requests" && (
          <div className="max-w-5xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Booking Requests</h1>
                <p className="text-slate-500 text-sm mt-0.5">
                  {bookings.length} result{bookings.length !== 1 ? "s" : ""}
                  {statusFilter && ` · ${STATUS_LABEL[statusFilter] ?? statusFilter}`}
                </p>
              </div>
              <button
                onClick={loadBookings}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-white hover:shadow-sm transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, email, or reference number…"
                value={bookingSearch}
                onChange={(e) => setBookingSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadBookings()}
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm"
              />
            </div>

            {/* Status filter chips */}
            <div className="flex flex-wrap gap-2 mb-6">
              {STATUS_FILTERS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => { setStatusFilter(value); }}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    statusFilter === value
                      ? "bg-blue-700 text-white border-blue-700 shadow-sm"
                      : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-700"
                  }`}
                >
                  {label}
                  {stats && value !== "" && (
                    <span className={`ml-1.5 text-xs ${statusFilter === value ? "opacity-75" : "text-slate-400"}`}>
                      {value === "new" ? stats.new
                        : value === "contacted" ? stats.contacted
                        : value === "confirmed" ? stats.confirmed
                        : value === "cancelled" ? stats.cancelled
                        : ""}
                    </span>
                  )}
                  {stats && value === "" && (
                    <span className={`ml-1.5 text-xs ${statusFilter === value ? "opacity-75" : "text-slate-400"}`}>
                      {stats.total_bookings}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* List */}
            {loadingData ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            ) : bookings.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center shadow-sm">
                <Ticket className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No booking requests found</p>
                <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filter.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bookings.map((b) => (
                  <div
                    key={b.id}
                    className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-4 px-5 py-4">
                      {/* Status indicator dot */}
                      <div className={`w-2 h-12 rounded-full flex-shrink-0 ${
                        b.status === "new" || b.status === "pending" ? "bg-yellow-400"
                          : b.status === "contacted" ? "bg-blue-500"
                          : b.status === "confirmed" || b.status === "completed" ? "bg-emerald-500"
                          : "bg-red-400"
                      }`} />

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-0.5">
                          <span className="font-mono text-sm font-bold text-blue-700">
                            {b.reference_id}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_BADGE[b.status] ?? ""}`}>
                            {b.status_label}
                          </span>
                          {!b.email_sent && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-50 text-amber-600 border border-amber-200">
                              <Mail className="w-3 h-3" /> No email
                            </span>
                          )}
                        </div>
                        <p className="font-semibold text-slate-800 text-sm">
                          {b.first_name} {b.last_name}
                          <span className="text-slate-400 font-normal ml-2">{b.email}</span>
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {b.origin} → {b.destination} · {b.airline} · {b.departure_date} · {b.num_passengers} pax
                        </p>
                      </div>

                      {/* Price + date + action */}
                      <div className="flex-shrink-0 text-right">
                        <p className="text-base font-bold text-sky-600">
                          {b.currency} {b.price.toLocaleString()}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {new Date(b.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      <button
                        onClick={() => setSelectedBooking(b)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-medium transition-colors flex-shrink-0"
                      >
                        View <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ Users ══ */}
        {section === "users" && (
          <div className="max-w-5xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Users</h1>
                <p className="text-slate-500 text-sm mt-0.5">{users.length} registered users</p>
              </div>
              <button
                onClick={loadUsers}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-white hover:shadow-sm transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>

            <div className="relative mb-5">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or email…"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadUsers()}
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm"
              />
            </div>

            {loadingData ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            ) : users.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center shadow-sm">
                <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No users found</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50">
                {users.map((u) => (
                  <div key={u.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0 ${
                      u.role === "admin" ? "bg-amber-500" : "bg-blue-600"
                    }`}>
                      {u.first_name[0]}{u.last_name[0]}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-800 text-sm">
                          {u.first_name} {u.last_name}
                        </p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          u.role === "admin"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-100 text-slate-600"
                        }`}>
                          {u.role}
                        </span>
                        {!u.is_active && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600">
                            Deactivated
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 truncate">{u.email}</p>
                      <p className="text-xs text-slate-400">
                        {u.booking_count} booking{u.booking_count !== 1 ? "s" : ""} ·
                        Joined {new Date(u.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Actions */}
                    {u.id !== user.id && (
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleToggleAdmin(u.id, u.role)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:border-amber-300 hover:text-amber-700 transition-colors whitespace-nowrap"
                        >
                          {u.role === "admin" ? "Remove Admin" : "Make Admin"}
                        </button>
                        <button
                          onClick={() => handleToggleActive(u.id, u.is_active)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap ${
                            u.is_active
                              ? "border-red-200 text-red-500 hover:bg-red-50"
                              : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                          }`}
                        >
                          {u.is_active ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id, u.email)}
                          disabled={deletingUserId === u.id}
                          className="px-3 py-1.5 rounded-lg border border-red-200 text-xs font-medium text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors whitespace-nowrap flex items-center gap-1"
                        >
                          {deletingUserId === u.id
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : "Delete"
                          }
                        </button>
                      </div>
                    )}
                    {u.id === user.id && (
                      <span className="text-xs text-slate-400 italic flex-shrink-0">You</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Booking detail drawer ── */}
      {selectedBooking && (
        <BookingDrawer
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* Slide-in animation */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
