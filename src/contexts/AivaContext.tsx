import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type AivaViewMode = "floating" | "sidebar";
const VIEW_MODE_KEY = "aiva-view-mode";

interface AivaContextValue {
  open: boolean;
  /** Optional prompt pre-filled when the drawer opens — used by callers that
   *  want to hand off a query (e.g. "ถามหมอเมย์" from MagicSearch). */
  initialPrompt: string;
  /** "floating" = bottom-right modal card; "sidebar" = inline right rail that
   *  shifts the page content. Persisted across reloads. */
  viewMode: AivaViewMode;
  setViewMode: (mode: AivaViewMode) => void;
  toggleViewMode: () => void;
  openAiva: (prompt?: string) => void;
  closeAiva: () => void;
  toggleAiva: () => void;
}

const AivaCtx = createContext<AivaContextValue | null>(null);

export function AivaProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState("");
  const [viewMode, setViewModeState] = useState<AivaViewMode>(() => {
    if (typeof window === "undefined") return "floating";
    return (localStorage.getItem(VIEW_MODE_KEY) as AivaViewMode) || "floating";
  });

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem(VIEW_MODE_KEY, viewMode);
  }, [viewMode]);

  const setViewMode = useCallback((mode: AivaViewMode) => setViewModeState(mode), []);
  const toggleViewMode = useCallback(
    () => setViewModeState((m) => (m === "floating" ? "sidebar" : "floating")),
    [],
  );

  const openAiva = useCallback((prompt?: string) => {
    setInitialPrompt(prompt ?? "");
    setOpen(true);
  }, []);
  const closeAiva = useCallback(() => setOpen(false), []);
  const toggleAiva = useCallback(() => setOpen((v) => !v), []);

  return (
    <AivaCtx.Provider
      value={{
        open,
        initialPrompt,
        viewMode,
        setViewMode,
        toggleViewMode,
        openAiva,
        closeAiva,
        toggleAiva,
      }}
    >
      {children}
    </AivaCtx.Provider>
  );
}

export function useAiva(): AivaContextValue {
  const ctx = useContext(AivaCtx);
  if (!ctx) throw new Error("useAiva must be used within AivaProvider");
  return ctx;
}
