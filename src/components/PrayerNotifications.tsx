"use client";

import { useEffect } from "react";
import { nextPrayer, PRAYER_LABEL, Prayer } from "@/domain/prayerTimes";
import { PRAYER_NOTIFICATIONS_KEY } from "@/hooks/usePrayerNotificationSetting";

/** A reminder this late is stale — the device was asleep through it. */
const MAX_LATE_MS = 5 * 60 * 1000;

async function notify(prayer: Prayer) {
  const title = `${PRAYER_LABEL[prayer]} time`;
  const options: NotificationOptions = {
    body: `It's time for ${PRAYER_LABEL[prayer]}.`,
    icon: "/icon.svg",
    tag: `prayer-${prayer}`,
  };
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration) return await registration.showNotification(title, options);
  } catch {
    // fall through to the page-level API
  }
  new Notification(title, options);
}

/** Fires a notification at each calculated prayer time while the app is open
 * (or installed and backgrounded). Opt-in: does nothing unless the user turned
 * it on in Settings and the browser granted permission. */
export function PrayerNotifications() {
  useEffect(() => {
    if (typeof Notification === "undefined") return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    function enabled() {
      try {
        return localStorage.getItem(PRAYER_NOTIFICATIONS_KEY) === "1" && Notification.permission === "granted";
      } catch {
        return false;
      }
    }

    function schedule() {
      clearTimeout(timer);
      if (cancelled || !enabled()) return;
      const upcoming = nextPrayer(new Date());
      // setTimeout caps near 24.8 days; a prayer is always < 1 day away.
      timer = setTimeout(() => {
        // Timers in a backgrounded tab can fire late; skip a stale one.
        if (enabled() && Date.now() - upcoming.at.getTime() < MAX_LATE_MS) void notify(upcoming.prayer);
        schedule();
      }, Math.max(0, upcoming.at.getTime() - Date.now()));
    }

    // Timers drift or are throttled while hidden, and Settings flips the
    // switch — recompute whenever either could have changed the answer.
    const onChange = () => schedule();
    document.addEventListener("visibilitychange", onChange);
    window.addEventListener("prayer-notifications-changed", onChange);
    schedule();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onChange);
      window.removeEventListener("prayer-notifications-changed", onChange);
    };
  }, []);

  return null;
}
