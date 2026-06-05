import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";

export type UserRole = "doctor" | "nurse" | "admin" | "staff";

export interface User {
  name: string;
  title: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
}

interface UserContextValue {
  user: User;
}

const DEFAULT_USER: User = {
  name: "นพ.ราอูล มันเมาะ",
  title: "Senior Strategist",
  email: "raul.mannmoh@hospital.co.th",
  role: "doctor",
};

const UserCtx = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  // Stubbed for now — replace with real auth user when ready.
  const value = useMemo<UserContextValue>(() => ({ user: DEFAULT_USER }), []);
  return <UserCtx.Provider value={value}>{children}</UserCtx.Provider>;
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserCtx);
  if (!ctx) throw new Error("useUser must be used inside <UserProvider>");
  return ctx;
}
