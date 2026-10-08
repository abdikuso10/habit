"use client";

import { useEffect, useState } from "react";

/*
  A rev-counter drawn for the journey: the needle sweeps 270° from zero to the
  last day, and the final fifth of the dial is the high zone. It is the same
  number as the progress bar beneath the title, shown the way a driver reads
  one — so it stays decorative to assistive tech and the bar remains the
  accessible readout.
*/

const SIZE = 112;
const C = SIZE / 2;
const START = 135; // degrees, clockwise from 3 o'clock
const SWEEP = 270;

function polar(angleDeg: number, r: number) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: C + Math.cos(a) * r, y: C + Math.sin(a) * r };
}

function arc(fromPct: number, toPct: number, r: number): string {
  const a0 = START + SWEEP * fromPct;
  const a1 = START + SWEEP * toPct;
  const p0 = polar(a0, r);
  const p1 = polar(a1, r);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
}

export function Tachometer({ percent }: { percent: number }) {
  const target = Math.min(1, Math.max(0, percent / 100));
  // The start-up sweep every instrument cluster performs: the needle runs to
  // the stop, then settles on the real value. Skipped for reduced motion.
  const [v, setV] = useState(0);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      const t = setTimeout(() => setV(target), 0);
      return () => clearTimeout(t);
    }
    const up = setTimeout(() => setV(1), 120);
    const down = setTimeout(() => setV(target), 1000);
    return () => {
      clearTimeout(up);
      clearTimeout(down);
    };
  }, [target]);
  const needle = START + SWEEP * v;

  const ticks = Array.from({ length: 51 }, (_, i) => {
    const f = i / 50;
    const major = i % 5 === 0;
    const a = START + SWEEP * f;
    const p0 = polar(a, major ? 38 : 41);
    const p1 = polar(a, 45);
    const hot = f >= 0.8;
    return (
      <line
        key={i}
        x1={p0.x}
        y1={p0.y}
        x2={p1.x}
        y2={p1.y}
        stroke={hot ? "var(--brass)" : "#f3f3f1"}
        strokeWidth={major ? 1.6 : 0.7}
        opacity={major ? 1 : 0.55}
      />
    );
  });

  const labels = [0, 2, 4, 6, 8, 10].map((n) => {
    const p = polar(START + SWEEP * (n / 10), 30);
    return (
      <text
        key={n}
        x={p.x}
        y={p.y}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="7"
        fill={n >= 8 ? "var(--brass)" : "#f3f3f1"}
        style={{ fontFamily: "var(--font-numeric), monospace" }}
      >
        {n}
      </text>
    );
  });

  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true" className="shrink-0">
      <circle cx={C} cy={C} r={54} fill="#050506" stroke="#3a3a40" strokeWidth={1.5} />
      <circle cx={C} cy={C} r={51} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={0.6} />
      <path d={arc(0.8, 1, 47.5)} fill="none" stroke="var(--brass)" strokeWidth={2.2} />
      {ticks}
      {labels}
      <text
        x={C}
        y={C + 22}
        textAnchor="middle"
        fontSize="5.2"
        letterSpacing="1.6"
        fill="#a9a9b0"
        style={{ fontFamily: "var(--font-display), sans-serif" }}
      >
        JOURNEY ×10%
      </text>
      <g
        style={{
          transform: `rotate(${needle}deg)`,
          transformOrigin: `${C}px ${C}px`,
          transition: "transform 0.85s cubic-bezier(0.3, 0.9, 0.25, 1)",
        }}
      >
        <polygon points={`${C - 8},${C - 1.2} ${C + 40},${C} ${C - 8},${C + 1.2}`} fill="var(--brass)" />
        <polygon points={`${C - 8},${C - 1.2} ${C - 14},${C - 2.4} ${C - 14},${C + 2.4} ${C - 8},${C + 1.2}`} fill="var(--brass)" />
      </g>
      <circle cx={C} cy={C} r={4.6} fill="#1b1b1e" stroke="#6b6b73" strokeWidth={0.8} />
      <circle cx={C} cy={C} r={1.5} fill="var(--brass)" />
    </svg>
  );
}
