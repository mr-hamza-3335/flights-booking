"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import {
  Plane, LogOut, LayoutDashboard, ShieldCheck,
  ChevronDown, Search, Bell, User,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const FLOW_LINKS = [
  { href: "/",        label: "Search"  },
  { href: "/results", label: "Results" },
  { href: "/booking", label: "Booking" },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, loading } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleLogout() {
    logout();
    setDropdownOpen(false);
    router.push("/");
  }

  const isFlowPage = FLOW_LINKS.some((l) => l.href === pathname) || pathname === "/success";

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm shadow-sm border-b border-sky-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
              <Plane className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-900 to-sky-500 bg-clip-text text-transparent">
                SkyRequest
              </span>
              <p className="text-xs text-slate-400 leading-none -mt-0.5 hidden sm:block">
                Flight Request Portal
              </p>
            </div>
          </Link>

          {/* Centre nav — authenticated users see full links; anonymous see flow breadcrumb */}
          {!loading && user ? (
            <nav className="hidden md:flex items-center gap-1">
              <Link
                href="/"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  pathname === "/" ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:text-blue-700 hover:bg-slate-50"
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                Search
              </Link>
              <Link
                href="/dashboard"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  pathname === "/dashboard" ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:text-blue-700 hover:bg-slate-50"
                }`}
              >
                <Plane className="w-3.5 h-3.5" />
                My Bookings
              </Link>
              <Link
                href="/price-alerts"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  pathname === "/price-alerts" ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:text-blue-700 hover:bg-slate-50"
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                Price Alerts
              </Link>
              <Link
                href="/track"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  pathname === "/track" ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:text-blue-700 hover:bg-slate-50"
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                Track
              </Link>
              {user.role === "admin" && (
                <Link
                  href="/admin"
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    pathname.startsWith("/admin") ? "bg-amber-50 text-amber-700" : "text-slate-500 hover:text-amber-600 hover:bg-amber-50"
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Admin
                </Link>
              )}
            </nav>
          ) : (
            isFlowPage && (
              <nav className="hidden md:flex items-center gap-1">
                {FLOW_LINKS.map((link, idx) => {
                  const isActive = pathname === link.href;
                  return (
                    <div key={link.href} className="flex items-center gap-1">
                      {idx > 0 && <span className="text-slate-200 text-sm mx-1">›</span>}
                      <Link
                        href={link.href}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          isActive ? "bg-blue-50 text-blue-700 font-semibold" : "text-slate-500 hover:text-blue-600 hover:bg-slate-50"
                        }`}
                      >
                        <span className={`inline-flex items-center gap-1.5 ${isActive ? "" : "opacity-60"}`}>
                          <span className={`w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center ${
                            isActive ? "bg-blue-700 text-white" : "bg-slate-200 text-slate-500"
                          }`}>
                            {idx + 1}
                          </span>
                          {link.label}
                        </span>
                      </Link>
                    </div>
                  );
                })}
              </nav>
            )
          )}

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Live indicator */}
            <div className="flex items-center gap-1.5 text-sm text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="hidden lg:inline text-xs">Live</span>
            </div>

            {/* Auth area */}
            {!loading && (
              <>
                {user ? (
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-medium transition-colors"
                    >
                      <div className="w-7 h-7 rounded-full bg-blue-700 text-white flex items-center justify-center text-xs font-bold">
                        {user.first_name[0]}{user.last_name[0]}
                      </div>
                      <span className="hidden sm:inline">{user.first_name}</span>
                      {user.role === "admin" && (
                        <span className="hidden sm:inline bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full font-semibold">
                          Admin
                        </span>
                      )}
                      <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
                    </button>

                    {dropdownOpen && (
                      <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50">
                        <div className="px-4 py-2.5 border-b border-slate-100">
                          <p className="text-sm font-semibold text-slate-800">
                            {user.first_name} {user.last_name}
                          </p>
                          <p className="text-xs text-slate-400 truncate">{user.email}</p>
                        </div>

                        {/* Mobile nav links — visible on small screens */}
                        <div className="md:hidden border-b border-slate-100 pb-1">
                          <Link href="/" onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-700">
                            <Search className="w-4 h-4" /> Search Flights
                          </Link>
                          <Link href="/dashboard" onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-700">
                            <Plane className="w-4 h-4" /> My Bookings
                          </Link>
                          <Link href="/price-alerts" onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-700">
                            <Bell className="w-4 h-4" /> Price Alerts
                          </Link>
                          <Link href="/track" onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-700">
                            <Search className="w-4 h-4" /> Track Booking
                          </Link>
                        </div>

                        <Link
                          href="/dashboard"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-700 transition-colors"
                        >
                          <LayoutDashboard className="w-4 h-4" />
                          Dashboard
                        </Link>

                        <Link
                          href="/dashboard#profile"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-700 transition-colors"
                        >
                          <User className="w-4 h-4" />
                          Profile
                        </Link>

                        {user.role === "admin" && (
                          <Link
                            href="/admin"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-amber-600 transition-colors"
                          >
                            <ShieldCheck className="w-4 h-4" />
                            Admin Panel
                          </Link>
                        )}

                        <div className="border-t border-slate-100 mt-1 pt-1">
                          <button
                            onClick={handleLogout}
                            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Link
                      href="/auth/login"
                      className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-blue-700 transition-colors"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/auth/signup"
                      className="px-4 py-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium transition-colors shadow-sm"
                    >
                      Sign Up
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
