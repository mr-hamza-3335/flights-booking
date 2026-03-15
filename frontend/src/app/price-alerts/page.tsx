"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, Trash2, Loader2, Plus, Plane, TrendingDown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getAlerts, deleteAlert, createAlert } from "@/lib/api";
import { AlertOut } from "@/types";
import toast from "react-hot-toast";
import ErrorAlert from "@/components/ErrorAlert";

export default function PriceAlertsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [alerts, setAlerts] = useState<AlertOut[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    origin: "",
    destination: "",
    origin_label: "",
    destination_label: "",
    target_price: "",
  });

  useEffect(() => {
    if (!authLoading && !user) router.replace("/auth/login");
  }, [user, authLoading, router]);

  const loadAlerts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      setAlerts(await getAlerts());
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : "Failed to load alerts. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadAlerts(); }, [loadAlerts]);

  async function handleDelete(id: number) {
    await deleteAlert(id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    toast.success("Alert removed");
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const price = parseFloat(form.target_price);
    if (isNaN(price) || price <= 0) {
      toast.error("Enter a valid target price");
      return;
    }
    setSubmitting(true);
    try {
      const newAlert = await createAlert({
        origin: form.origin.toUpperCase(),
        destination: form.destination.toUpperCase(),
        origin_label: form.origin_label || form.origin.toUpperCase(),
        destination_label: form.destination_label || form.destination.toUpperCase(),
        target_price: price,
      });
      setAlerts((prev) => [newAlert, ...prev]);
      setForm({ origin: "", destination: "", origin_label: "", destination_label: "", target_price: "" });
      setShowForm(false);
      toast.success("Price alert created!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create alert");
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Bell className="w-6 h-6 text-blue-600" />
            Price Alerts
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Get notified when flight prices drop to your target.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Alert
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white rounded-2xl border border-blue-100 shadow-sm p-6 mb-6"
        >
          <h2 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wide">
            Create Price Alert
          </h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                From (IATA code)
              </label>
              <input
                required
                maxLength={3}
                placeholder="e.g. LHR"
                value={form.origin}
                onChange={(e) => setForm((p) => ({ ...p, origin: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                To (IATA code)
              </label>
              <input
                required
                maxLength={3}
                placeholder="e.g. DXB"
                value={form.destination}
                onChange={(e) => setForm((p) => ({ ...p, destination: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Target Price (USD)
            </label>
            <input
              required
              type="number"
              min="1"
              step="1"
              placeholder="e.g. 450"
              value={form.target_price}
              onChange={(e) => setForm((p) => ({ ...p, target_price: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-semibold transition-colors flex items-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Alert
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <ErrorAlert
        message={loadError}
        onRetry={() => { setLoadError(""); loadAlerts(); }}
        onDismiss={() => setLoadError("")}
        className="mb-4"
      />

      {/* Alerts list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <TrendingDown className="w-7 h-7 text-blue-400" />
          </div>
          <p className="text-slate-600 font-semibold mb-1">No price alerts yet</p>
          <p className="text-slate-400 text-sm mb-4">
            Create an alert and we will notify you when prices drop.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create your first alert
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((a) => (
            <div
              key={a.id}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Plane className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800">
                  {a.origin_label || a.origin}
                  <span className="text-slate-400 mx-2">→</span>
                  {a.destination_label || a.destination}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-sm text-slate-500">
                    Target:{" "}
                    <span className="font-semibold text-sky-600">
                      USD {a.target_price.toLocaleString()}
                    </span>
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                      a.is_active
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        a.is_active ? "bg-emerald-500" : "bg-slate-400"
                      }`}
                    />
                    {a.is_active ? "Active" : "Triggered"}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Created {new Date(a.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => handleDelete(a.id)}
                className="p-2 rounded-xl text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors flex-shrink-0"
                title="Delete alert"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 text-center">
        <Link
          href="/dashboard"
          className="text-sm text-blue-600 hover:text-blue-800 font-medium hover:underline"
        >
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
