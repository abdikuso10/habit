"use client";

import { useEffect, useRef } from "react";

export function useDebouncedCallback<Args extends unknown[]>(
  fn: (...args: Args) => void,
  delayMs: number
): (...args: Args) => void {
  const fnRef = useRef(fn);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fnRef.current = fn;
  });

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (...args: Args) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => fnRef.current(...args), delayMs);
  };
}
