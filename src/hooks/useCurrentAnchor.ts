"use client";

import { useEffect, useState } from "react";
import { DayAnchor, currentAnchor } from "@/domain/cues";

/**
 * The anchor the day is currently in, re-checked every minute.
 *
 * The initial value is read once on mount rather than during render, so the
 * clock can never differ between the server-rendered HTML and the first
 * client render. Everything driven by this is presentational — where the
 * "now" marker sits, what colour the hour rule is — so a late or throttled
 * tick costs nothing.
 */
export function useCurrentAnchor(): DayAnchor | null {
  const [anchor, setAnchor] = useState<DayAnchor | null>(null);

  useEffect(() => {
    const update = () => setAnchor(currentAnchor(new Date()));
    update();
    const interval = setInterval(update, 60_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") update();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return anchor;
}
