import { createContext, useContext, useState, useCallback, useMemo } from "react";
import type { ReactNode } from "react";

export type UserRole =
  | "doctor"
  | "nurse"
  | "pharmacist"
  | "reception"
  | "admin";

export interface User {
  name: string;
  title: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  /** 2-letter avatar fallback. */
  initials?: string;
  /** Provider ID — professional license / system provider number. */
  providerId?: string;
  /** Uploaded handwritten-signature image (data URL) — stamped on documents
   *  such as the medical certificate. */
  signatureUrl?: string;
  /** Work context chosen on the login screen (step 2). */
  branch?: string;
  department?: string;
  room?: string;
}

interface UserContextValue {
  user: User;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
  /** Set/clear the doctor's signature image (persisted to localStorage). */
  setSignature: (dataUrl: string | null) => void;
}

const SIGNATURE_KEY = "ehp.doctor.signature";

const DEFAULT_USER: User = {
  name: "นพ.ราอูล มันเมาะ",
  title: "Senior Strategist",
  email: "raul.mannmoh@hospital.co.th",
  role: "doctor",
  providerId: "38492",
};

const UserCtx = createContext<UserContextValue | null>(null);

function loadSignature(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return window.localStorage.getItem(SIGNATURE_KEY) ?? undefined;
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(() => ({ ...DEFAULT_USER, signatureUrl: loadSignature() }));
  const [isAuthenticated, setAuthenticated] = useState(false);

  const login = useCallback((next: User) => {
    // keep any already-saved signature unless the new identity carries one
    setUser({ ...next, signatureUrl: next.signatureUrl ?? loadSignature() });
    setAuthenticated(true);
  }, []);

  const logout = useCallback(() => setAuthenticated(false), []);

  const setSignature = useCallback((dataUrl: string | null) => {
    if (typeof window !== "undefined") {
      if (dataUrl) window.localStorage.setItem(SIGNATURE_KEY, dataUrl);
      else window.localStorage.removeItem(SIGNATURE_KEY);
    }
    setUser((u) => ({ ...u, signatureUrl: dataUrl ?? undefined }));
  }, []);

  const value = useMemo<UserContextValue>(
    () => ({ user, isAuthenticated, login, logout, setSignature }),
    [user, isAuthenticated, login, logout, setSignature]
  );
  return <UserCtx.Provider value={value}>{children}</UserCtx.Provider>;
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserCtx);
  if (!ctx) throw new Error("useUser must be used inside <UserProvider>");
  return ctx;
}
