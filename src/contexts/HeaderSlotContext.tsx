import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

interface HeaderSlotValue {
  leftContent: ReactNode;
  setLeftContent: (n: ReactNode) => void;
}

const HeaderSlotCtx = createContext<HeaderSlotValue | null>(null);

export function HeaderSlotProvider({ children }: { children: ReactNode }) {
  const [leftContent, setLeftContent] = useState<ReactNode>(null);
  return (
    <HeaderSlotCtx.Provider value={{ leftContent, setLeftContent }}>
      {children}
    </HeaderSlotCtx.Provider>
  );
}

export function useHeaderSlot(): HeaderSlotValue {
  const ctx = useContext(HeaderSlotCtx);
  if (!ctx) throw new Error("useHeaderSlot must be used inside HeaderSlotProvider");
  return ctx;
}

/**
 * Page-side helper to inject content into the global header's left area
 * (just right of the logo). Pass a memoized React node — identity changes
 * trigger re-registration. Cleared automatically on unmount.
 */
export function useHeaderLeft(node: ReactNode) {
  const { setLeftContent } = useHeaderSlot();
  useEffect(() => {
    setLeftContent(node);
    return () => setLeftContent(null);
  }, [node, setLeftContent]);
}
