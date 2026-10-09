"use client";

import { useState } from "react";

/** Per-device on purpose: notification permission is granted per browser, so
 * the switch lives beside it rather than in the synced vault. */
export const PRAYER_NOTIFICATIONS_KEY = "habit.prayerNotifications";

export type PrayerNotificationStatus = "on" | "off" | "denied" | "unsupported";

function read(): PrayerNotificationStatus {
  if (typeof Notification === "undefined") return "unsupported";
  if (Notification.permission === "denied") return "denied";
  try {
    return localStorage.getItem(PRAYER_NOTIFICATIONS_KEY) === "1" && Notification.permission === "granted"
      ? "on"
      : "off";
  } catch {
    return "off";
  }
}

export function usePrayerNotificationSetting() {
  const [status, setStatus] = useState<PrayerNotificationStatus>(read);

  async function setEnabled(enable: boolean) {
    if (enable) {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setStatus(read());
    }
    try {
      if (enable) localStorage.setItem(PRAYER_NOTIFICATIONS_KEY, "1");
      else localStorage.removeItem(PRAYER_NOTIFICATIONS_KEY);
    } catch {
      // storage blocked: the switch just won't stick
    }
    window.dispatchEvent(new Event("prayer-notifications-changed"));
    setStatus(read());
  }

  return { status, setEnabled };
}
