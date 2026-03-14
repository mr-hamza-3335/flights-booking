"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { AuthUser, LoginPayload, SignupPayload } from "@/types";
import { getMe, login as apiLogin, signup as apiSignup } from "@/lib/api";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  signup: (payload: SignupPayload) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const persist = (tk: string, u: AuthUser) => {
    localStorage.setItem("sr_token", tk);
    setToken(tk);
    setUser(u);
  };

  const logout = useCallback(() => {
    localStorage.removeItem("sr_token");
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const tk = localStorage.getItem("sr_token");
    if (!tk) {
      setLoading(false);
      return;
    }
    try {
      setToken(tk);
      const u = await getMe();
      setUser(u);
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (payload: LoginPayload) => {
    const res = await apiLogin(payload);
    persist(res.access_token, res.user);
  }, []);

  const signup = useCallback(async (payload: SignupPayload) => {
    const res = await apiSignup(payload);
    persist(res.access_token, res.user);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
