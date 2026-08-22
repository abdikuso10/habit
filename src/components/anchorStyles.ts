import { DayAnchor } from "@/domain/cues";

/** Each anchor's hue, as the CSS custom property defined in globals.css.
 * Kept out of the domain layer: this is presentation, not behaviour. */
export const ANCHOR_HUE: Record<DayAnchor, string> = {
  wake: "var(--hour-wake)",
  fajr: "var(--hour-fajr)",
  morning: "var(--hour-morning)",
  dhuhr: "var(--hour-dhuhr)",
  asr: "var(--hour-asr)",
  maghrib: "var(--hour-maghrib)",
  isha: "var(--hour-isha)",
  night: "var(--hour-night)",
};

/** Habits with no cue belong to no hour, so they get the ink colour rather
 * than a borrowed one. */
export const UNANCHORED_HUE = "var(--ink-faint)";

export function hueFor(anchor: DayAnchor | null | undefined): string {
  return anchor ? ANCHOR_HUE[anchor] : UNANCHORED_HUE;
}

/** Stable DOM id for an anchor's section, so the arc can link to it. */
export function anchorSectionId(anchor: DayAnchor | null): string {
  return `anchor-${anchor ?? "all-day"}`;
}
