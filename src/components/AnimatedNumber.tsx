"use client";

import { animate, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";

export function AnimatedNumber({
  value,
  suffix = "",
  className,
}: {
  value: number;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const prevRef = useRef(0);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (prefersReducedMotion) {
      prevRef.current = value;
      node.textContent = `${Math.round(value).toLocaleString()}${suffix}`;
      return;
    }

    const from = prevRef.current;
    const controls = animate(from, value, {
      duration: 0.6,
      ease: "easeOut",
      onUpdate(v) {
        node.textContent = `${Math.round(v).toLocaleString()}${suffix}`;
      },
      onComplete() {
        prevRef.current = value;
      },
    });
    return () => controls.stop();
  }, [value, suffix, prefersReducedMotion]);

  return (
    <span ref={ref} className={className}>
      {Math.round(value).toLocaleString()}
      {suffix}
    </span>
  );
}
