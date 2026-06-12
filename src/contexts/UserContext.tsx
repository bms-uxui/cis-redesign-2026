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
  /** Hospital the user signed into (set on the login screen). */
  hospital?: string;
}

interface UserContextValue {
  user: User;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
}

const DEFAULT_USER: User = {
  name: "นพ.ราอูล มันเมาะ",
  title: "Senior Strategist",
  email: "raul.mannmoh@hospital.co.th",
  role: "doctor",
};

const UserCtx = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(DEFAULT_USER);
  const [isAuthenticated, setAuthenticated] = useState(false);

  const login = useCallback((next: User) => {
    setUser(next);
    setAuthenticated(true);
  }, []);

  const logout = useCallback(() => setAuthenticated(false), []);

  const value = useMemo<UserContextValue>(
    () => ({ user, isAuthenticated, login, logout }),
    [user, isAuthenticated, login, logout]
  );
  return <UserCtx.Provider value={value}>{children}</UserCtx.Provider>;
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserCtx);
  if (!ctx) throw new Error("useUser must be used inside <UserProvider>");
  return ctx;
}
