import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

interface AivaContextValue {
  open: boolean;
  /** Optional prompt pre-filled when the drawer opens — used by callers that
   *  want to hand off a query (e.g. "ถามหมอเมย์" from MagicSearch). */
  initialPrompt: string;
  openAiva: (prompt?: string) => void;
  closeAiva: () => void;
  toggleAiva: () => void;
}

const AivaCtx = createContext<AivaContextValue | null>(null);

export function AivaProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState("");

  const openAiva = useCallback((prompt?: string) => {
    setInitialPrompt(prompt ?? "");
    setOpen(true);
  }, []);
  const closeAiva = useCallback(() => setOpen(false), []);
  const toggleAiva = useCallback(() => setOpen((v) => !v), []);

  return (
    <AivaCtx.Provider
      value={{ open, initialPrompt, openAiva, closeAiva, toggleAiva }}
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
