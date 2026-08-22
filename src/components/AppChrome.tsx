"use client";

import { useEffect } from "react";
import { useCurrentAnchor } from "@/hooks/useCurrentAnchor";
import { ANCHOR_HUE } from "./anchorStyles";
import { CorruptedDataScreen } from "./CorruptedDataScreen";
import { Header } from "./Header";
import { LockScreen } from "./LockScreen";
import { SetupScreen } from "./SetupScreen";
import { useTracker } from "@/providers/TrackerProvider";

/** Shown when the database can't be reached. The data is not lost — this app
 * simply can't work without a connection, which is the tradeoff of keeping a
 * single copy in Postgres. */
function UnreachableScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-panel p-6 text-center sm:p-8">
        <h1 className="font-display text-2xl text-parchment">Can&apos;t reach your data</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate">
          Your habits, journal and ledger are stored in the database, so the app needs a connection to open. Nothing has
          been lost — check your network and try again.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-5 min-h-11 w-full rounded-lg bg-gold px-4 py-2.5 text-sm font-medium text-night transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          Try again
        </button>
      </div>
    </main>
  );
}

/** Gates every route on load/auth state and renders the shared header + nav
 * once, so navigating between Today/Week/Journey doesn't re-mount the
 * provider or ask the user to unlock again. */
export function AppChrome({ children }: { children: React.ReactNode }) {
  const { loadStatus, isUnlocked, corruptedBackupKey } = useTracker();
  const anchor = useCurrentAnchor();

  // The hairline at the top of the page carries the current hour's colour.
  // Set on the document element rather than passed down, because the rule is
  // fixed-position chrome that sits outside this subtree.
  useEffect(() => {
    if (!anchor) return;
    document.documentElement.style.setProperty("--hour-now", ANCHOR_HUE[anchor]);
  }, [anchor]);

  if (loadStatus === "loading") return null;
  if (loadStatus === "unreachable") return <UnreachableScreen />;
  if (loadStatus === "corrupted") return <CorruptedDataScreen preservedKey={corruptedBackupKey} />;
  if (loadStatus === "empty") return <SetupScreen />;
  if (!isUnlocked) return <LockScreen />;

  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">{children}</main>
    </>
  );
}
