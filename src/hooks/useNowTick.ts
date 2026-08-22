"use client";

import { useEffect, useState } from "react";

/** Re-renders the caller every second while `active`, so a running timer's
 * display stays live. The persisted value is always derived from
 * timestamps (see domain/timer.ts), so this tick is purely cosmetic — a
 * throttled or missed tick (e.g. a backgrounded tab) never corrupts it. */
export function useNowTick(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [active]);

  return now;
}
