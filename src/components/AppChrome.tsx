"use client";

import { useEffect, useState } from "react";
import { useCurrentAnchor } from "@/hooks/useCurrentAnchor";
import { ANCHOR_HUE } from "./anchorStyles";
import { CorruptedDataScreen } from "./CorruptedDataScreen";
import { DayReviewDialog } from "./DayReviewDialog";
import { Header } from "./Header";
import { LockScreen } from "./LockScreen";
import { SetupScreen } from "./SetupScreen";
import { useTracker } from "@/providers/TrackerProvider";

/**
 * Shown only after the retries in the provider have all failed.
 *
 * Retrying here calls back into the provider rather than reloading the page:
 * a reload throws away everything in memory to solve a problem that is usually
 * a dropped request. The app also retries by itself when the browser comes back
 * online, so this screen is a last resort rather than the only way out.
 */
function UnreachableScreen({ onRetry }: { onRetry: () => void }) {
  const [retrying, setRetrying] = useState(false);

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-panel p-6 text-center sm:p-8">
        <h1 className="font-display text-2xl text-parchment">Can&apos;t reach your data</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate">
          Your habits, journal and ledger are stored in the database, so the app needs a connection to open. Nothing has
          been lost. This will retry on its own once you&apos;re back online.
        </p>
        <button
          type="button"
          disabled={retrying}
          onClick={() => {
            setRetrying(true);
            onRetry();
            // The provider flips to "loading" and this screen unmounts on
            // success; on failure it remounts, so just re-enable shortly.
            setTimeout(() => setRetrying(false), 1500);
          }}
          className="mt-5 min-h-11 w-full rounded-lg bg-gold px-4 py-2.5 text-sm font-medium text-night transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-60"
        >
          {retrying ? "Trying…" : "Try again"}
        </button>
      </div>
    </main>
  );
}

/** Gates every route on load/auth state and renders the shared header + nav
 * once, so navigating between Today/Week/Journey doesn't re-mount the
 * provider or ask the user to unlock again. */
export function AppChrome({ children }: { children: React.ReactNode }) {
  const { loadStatus, isUnlocked, corruptedBackupKey, retryLoad } = useTracker();
  const anchor = useCurrentAnchor();

  // The hairline at the top of the page carries the current hour's colour.
  // Set on the document element rather than passed down, because the rule is
  // fixed-position chrome that sits outside this subtree.
  useEffect(() => {
    if (!anchor) return;
    document.documentElement.style.setProperty("--hour-now", ANCHOR_HUE[anchor]);
  }, [anchor]);

  if (loadStatus === "loading") return null;
  if (loadStatus === "unreachable") return <UnreachableScreen onRetry={retryLoad} />;
  if (loadStatus === "corrupted") return <CorruptedDataScreen preservedKey={corruptedBackupKey} />;
  if (loadStatus === "empty") return <SetupScreen />;
  if (!isUnlocked) return <LockScreen />;

  return (
    <>
      {/* Rendered here rather than on the Today page so the report is the first
          thing seen whichever route was opened — a bookmark to Week or Journey
          should not skip the morning after. */}
      <DayReviewDialog />
      <Header />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">{children}</main>
    </>
  );
}
