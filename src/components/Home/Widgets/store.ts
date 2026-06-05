import { useCallback, useEffect, useState } from "react";
import { defaultPinnedIds } from "./catalog";

const STORAGE_KEY = "ehp-cis.home-widgets.v3";

export type WidgetSize = "compact" | "full";

export interface PinnedWidget {
  id: string; // dashboard id
  size: WidgetSize;
}

function loadPins(): PinnedWidget[] {
  if (typeof window === "undefined") {
    return defaultPinnedIds().map((id) => ({ id, size: "compact" }));
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultPinnedIds().map((id) => ({ id, size: "compact" }));
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Be permissive — accept old v2 shape (string[]) so users don't lose
    // their list if they happen to have v2 data on this device.
    return parsed
      .map((item): PinnedWidget | null => {
        if (typeof item === "string") return { id: item, size: "compact" };
        if (
          item &&
          typeof item === "object" &&
          typeof item.id === "string" &&
          (item.size === "compact" || item.size === "full")
        ) {
          return { id: item.id, size: item.size };
        }
        return null;
      })
      .filter((x): x is PinnedWidget => x !== null);
  } catch {
    return [];
  }
}

/**
 * Pinned dashboards on Home, with order + size. Each entry stores a
 * dashboard id and a display size (compact = single column tile, full =
 * full-width card with the dashboard rendered at native row height).
 */
export function useHomeWidgets() {
  const [pins, setPins] = useState<PinnedWidget[]>(() => loadPins());

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pins));
    } catch {
      /* ignore */
    }
  }, [pins]);

  const setAll = useCallback((next: PinnedWidget[]) => setPins(next), []);

  const resetToDefault = useCallback(
    () => setPins(defaultPinnedIds().map((id) => ({ id, size: "compact" }))),
    [],
  );

  const setSize = useCallback((id: string, size: WidgetSize) => {
    setPins((prev) => prev.map((p) => (p.id === id ? { ...p, size } : p)));
  }, []);

  const remove = useCallback((id: string) => {
    setPins((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return { pins, setAll, resetToDefault, setSize, remove };
}
