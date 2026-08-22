"use client";

import { useEffect, useState } from "react";

/** Registers the app-shell service worker in production only, and surfaces a
 * small, dismissible "update available" banner instead of forcing a reload.
 * Never requests notification permission — installability and offline
 * loading don't require it, and reminders (if ever added) must stay opt-in. */
export function ServiceWorkerRegistration() {
  const [updateReady, setUpdateReady] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      // A service worker registered during an earlier `npm run start` (or a
      // previous deploy) can otherwise keep intercepting requests once this
      // origin switches back to `next dev`, fighting the dev server's
      // hot-reload/RSC traffic. Dev builds actively clean that up instead of
      // just declining to register a new one.
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) registration.unregister();
      });
      return;
    }

    navigator.serviceWorker.register("/sw.js").then((registration) => {
      if (registration.waiting) {
        setWaitingWorker(registration.waiting);
        setUpdateReady(true);
      }
      registration.addEventListener("updatefound", () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          if (installing.state === "installed" && navigator.serviceWorker.controller) {
            setWaitingWorker(installing);
            setUpdateReady(true);
          }
        });
      });
    });

    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });
  }, []);

  if (!updateReady) return null;

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 mx-auto flex w-[min(92vw,24rem)] items-center justify-between gap-3 rounded-xl border border-white/10 bg-panel px-4 py-3 shadow-lg">
      <p className="text-sm text-parchment">A new version is ready.</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => waitingWorker?.postMessage("SKIP_WAITING")}
          className="min-h-9 rounded-lg bg-gold px-3 py-1.5 text-xs font-medium text-night hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          Reload
        </button>
        <button
          type="button"
          onClick={() => setUpdateReady(false)}
          aria-label="Dismiss update notice"
          className="min-h-9 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate hover:text-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          Later
        </button>
      </div>
    </div>
  );
}
