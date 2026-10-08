"use client";

import { useId } from "react";

/*
  A sports-chronograph watch face (octagonal Royal Oak case, black dial, accent-coloured seconds), shared by the focus and meditation timers.

  The references are the ones that make that design recognisable at a glance:
  an octagonal bezel held by eight hex screws, a tapisserie dial (the fine
  square grid), applied baton indices and baton hands with a pale lume fill.
  The rim of the dial carries a progress arc in the accent colour, so the
  watch tells the time *and* how far through the session you are.

  Angles are given in turns of the relevant hand — the caller decides what the
  hands mean (elapsed time for a stopwatch, time left for a countdown), which
  keeps this component purely presentational.
*/

const SIZE = 132;
const C = SIZE / 2;

function octagon(radius: number): string {
  return Array.from({ length: 8 }, (_, i) => {
    const a = ((i * 45 + 22.5) * Math.PI) / 180;
    return `${(C + Math.sin(a) * radius).toFixed(2)},${(C - Math.cos(a) * radius).toFixed(2)}`;
  }).join(" ");
}

export function WatchFace({
  seconds,
  progress,
  running,
  done = false,
  label,
  ariaLabel,
}: {
  /** The time the hands show, in seconds. */
  seconds: number;
  /** 0–1, drawn as an arc on the dial rim. */
  progress: number;
  running: boolean;
  done?: boolean;
  /** Tiny caption printed on the dial, like a model name. */
  label: string;
  ariaLabel: string;
}) {
  const uid = useId().replace(/:/g, "");
  const s = Math.max(0, seconds);
  const secAngle = (s % 60) * 6;
  const minAngle = ((s % 3600) / 3600) * 360;
  const hourAngle = ((s % 43200) / 43200) * 360;
  const accent = done ? "var(--kept)" : "var(--brass)";

  const R_DIAL = 40;
  const arcR = 41.5;
  const arcLen = 2 * Math.PI * arcR;
  const p = Math.min(1, Math.max(0, progress));

  const indices = Array.from({ length: 12 }, (_, i) => {
    const long = i % 3 === 0;
    return (
      <rect
        key={i}
        x={C - (long ? 1.7 : 1.2)}
        y={C - R_DIAL + 3.5}
        width={long ? 3.4 : 2.4}
        height={long ? 9 : 6.5}
        rx={0.4}
        fill="#f3f3f1"
        stroke="#0a0a0b"
        strokeWidth={0.4}
        transform={`rotate(${i * 30} ${C} ${C})`}
      />
    );
  });

  // Eight hex screws, one per corner of the octagon.
  const screws = Array.from({ length: 8 }, (_, i) => {
    const a = (i * 45 * Math.PI) / 180;
    const r = 57.5;
    const x = C + Math.sin(a) * r;
    const y = C - Math.cos(a) * r;
    return (
      <g key={i} transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${i * 45})`}>
        <circle r={2.7} fill={`url(#${uid}-steel)`} stroke="#05070b" strokeWidth={0.4} />
        <line x1={-1.4} y1={0} x2={1.4} y2={0} stroke="#3a4152" strokeWidth={0.7} />
      </g>
    );
  });

  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="img"
      aria-label={ariaLabel}
      className="shrink-0 drop-shadow-[0_10px_18px_rgba(0,0,0,0.55)]"
    >
      <defs>
        <linearGradient id={`${uid}-steel`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f1f3f7" />
          <stop offset="0.45" stopColor="#8c93a3" />
          <stop offset="1" stopColor="#3b4252" />
        </linearGradient>
        <linearGradient id={`${uid}-bezel`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#dfe3ea" />
          <stop offset="0.35" stopColor="#7d8596" />
          <stop offset="0.7" stopColor="#b9bfcb" />
          <stop offset="1" stopColor="#4a5163" />
        </linearGradient>
        <radialGradient id={`${uid}-dial`} cx="0.35" cy="0.3" r="0.9">
          <stop offset="0" stopColor="#1b1b1e" />
          <stop offset="1" stopColor="#050506" />
        </radialGradient>
        {/* Tapisserie: a fine square grid with a lit edge on each tile. */}
        <pattern id={`${uid}-tap`} width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="4" fill="none" />
          <path d="M0 0H4M0 0V4" stroke="rgba(255,255,255,0.09)" strokeWidth="0.5" />
          <path d="M0 4H4M4 0V4" stroke="rgba(0,0,0,0.5)" strokeWidth="0.5" />
        </pattern>
        <clipPath id={`${uid}-clip`}>
          <circle cx={C} cy={C} r={R_DIAL} />
        </clipPath>
      </defs>

      {/* Case: octagonal bezel, then a darker inner step. */}
      <polygon points={octagon(63)} fill={`url(#${uid}-bezel)`} stroke="#05070b" strokeWidth={0.8} />
      <polygon points={octagon(54)} fill="#0a0a0b" stroke="rgba(255,255,255,0.22)" strokeWidth={0.6} />
      {screws}

      {/* Dial */}
      <circle cx={C} cy={C} r={R_DIAL + 3} fill="#05070b" />
      <circle cx={C} cy={C} r={R_DIAL} fill={`url(#${uid}-dial)`} />
      <circle cx={C} cy={C} r={R_DIAL} fill={`url(#${uid}-tap)`} clipPath={`url(#${uid}-clip)`} />

      {/* Progress on the rim */}
      <circle
        cx={C}
        cy={C}
        r={arcR}
        fill="none"
        stroke={accent}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeDasharray={arcLen}
        strokeDashoffset={arcLen * (1 - p)}
        transform={`rotate(-90 ${C} ${C})`}
        opacity={p > 0 ? 0.95 : 0}
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />

      {indices}

      <text
        x={C}
        y={C - 14}
        textAnchor="middle"
        fontSize="4.2"
        letterSpacing="1.4"
        fill="#f3f3f1"
        opacity="0.8"
        style={{ fontFamily: "var(--font-display), serif" }}
      >
        {label.toUpperCase()}
      </text>

      {/* Hands: batons with a lume core, the signature of the model. */}
      <g transform={`rotate(${hourAngle} ${C} ${C})`}>
        <rect x={C - 2.4} y={C - 21} width={4.8} height={25} rx={0.8} fill="#cfd5e0" stroke="#05070b" strokeWidth={0.5} />
        <rect x={C - 1.1} y={C - 19} width={2.2} height={18} fill="#ffffff" />
      </g>
      <g transform={`rotate(${minAngle} ${C} ${C})`}>
        <rect x={C - 2} y={C - 34} width={4} height={38} rx={0.8} fill="#cfd5e0" stroke="#05070b" strokeWidth={0.5} />
        <rect x={C - 0.9} y={C - 32} width={1.8} height={30} fill="#ffffff" />
      </g>
      <g transform={`rotate(${secAngle} ${C} ${C})`} opacity={running ? 1 : 0.5}>
        <line x1={C} y1={C + 9} x2={C} y2={C - 37} stroke={accent} strokeWidth={0.9} strokeLinecap="round" />
        <circle cx={C} cy={C - 26} r={1.6} fill={accent} />
      </g>
      <circle cx={C} cy={C} r={3} fill={`url(#${uid}-steel)`} stroke="#05070b" strokeWidth={0.5} />
      <circle cx={C} cy={C} r={1} fill={accent} />
    </svg>
  );
}
