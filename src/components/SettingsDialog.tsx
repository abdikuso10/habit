"use client";

import { useState } from "react";
import { usePrayerNotificationSetting } from "@/hooks/usePrayerNotificationSetting";
import { TrackerState } from "@/persistence/types";
import { useTracker } from "@/providers/TrackerProvider";
import { BackupTools } from "./BackupTools";
import { Dialog } from "./Dialog";

export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, updateSettings, updateMoneySettings } = useTracker();

  return (
    <Dialog open={open} onClose={onClose} title="Settings">
      {/* Rendered only while open, so its lazy initial state always reflects
          the current settings without an effect-based reset on every open. */}
      {open && state && (
        <SettingsForm
          state={state}
          onClose={onClose}
          updateSettings={updateSettings}
          updateMoneySettings={updateMoneySettings}
        />
      )}
    </Dialog>
  );
}

function SettingsForm({
  state,
  onClose,
  updateSettings,
  updateMoneySettings,
}: {
  state: TrackerState;
  onClose: () => void;
  updateSettings: (patch: Partial<Pick<TrackerState["settings"], "locale" | "focusTargetMinutes" | "meditationDefaultMinutes">>) => void;
  updateMoneySettings: (patch: Partial<TrackerState["settings"]["money"]>) => void;
}) {
  const prayer = usePrayerNotificationSetting();
  const [currency, setCurrency] = useState(state.settings.money.currency);
  const [savingsGoal, setSavingsGoal] = useState(state.settings.money.savingsGoal);
  const [startingDebt, setStartingDebt] = useState(state.settings.money.startingDebt);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateMoneySettings({ currency: currency.trim() || "KES", savingsGoal: Math.max(0, savingsGoal), startingDebt: Math.max(0, startingDebt) });
    onClose();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <span className="mb-1.5 block text-xs text-slate">Language &amp; direction</span>
        <div className="flex gap-2" role="radiogroup" aria-label="Language">
          <label
            className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-center text-sm transition ${
              state.settings.locale === "en" ? "border-gold/60 bg-gold/15 text-gold" : "border-white/10 text-slate"
            }`}
          >
            <input
              type="radio"
              name="locale"
              className="sr-only"
              checked={state.settings.locale === "en"}
              onChange={() => updateSettings({ locale: "en" })}
            />
            English
          </label>
          <label
            className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-center font-arabic text-sm transition ${
              state.settings.locale === "ar" ? "border-gold/60 bg-gold/15 text-gold" : "border-white/10 text-slate"
            }`}
          >
            <input
              type="radio"
              name="locale"
              className="sr-only"
              checked={state.settings.locale === "ar"}
              onChange={() => updateSettings({ locale: "ar" })}
            />
            العربية
          </label>
        </div>
      </div>

      <div>
        <span className="mb-1.5 block text-xs text-slate">Prayer notifications</span>
        <button
          type="button"
          role="switch"
          aria-checked={prayer.status === "on"}
          disabled={prayer.status === "denied" || prayer.status === "unsupported"}
          onClick={() => prayer.setEnabled(prayer.status !== "on")}
          className={`min-h-11 w-full rounded-lg border px-3 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-60 ${
            prayer.status === "on" ? "border-gold/60 bg-gold/15 text-gold" : "border-white/10 text-slate"
          }`}
        >
          {prayer.status === "on" ? "On — notify me at each prayer" : "Off — tap to enable"}
        </button>
        <p className="mt-1.5 text-xs text-slate">
          {prayer.status === "denied"
            ? "Notifications are blocked for this site. Allow them in your browser settings."
            : prayer.status === "unsupported"
              ? "This browser doesn't support notifications."
              : "Times are calculated for Nairobi. Delivered while the app is open or installed and running in the background."}
        </p>
      </div>

      <div>
        <label htmlFor="settings-currency" className="mb-1.5 block text-xs text-slate">
          Currency code
        </label>
        <input
          id="settings-currency"
          type="text"
          value={currency}
          onChange={(e) => setCurrency(e.target.value.toUpperCase())}
          maxLength={3}
          className="w-24 rounded-lg border border-white/10 bg-night px-3 py-2 text-sm uppercase text-parchment outline-none focus-visible:ring-2 focus-visible:ring-gold"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="settings-savings-goal" className="mb-1.5 block text-xs text-slate">
            Savings goal
          </label>
          <input
            id="settings-savings-goal"
            type="number"
            min={0}
            value={savingsGoal}
            onChange={(e) => setSavingsGoal(Number(e.target.value))}
            className="w-full rounded-lg border border-white/10 bg-night px-3 py-2 text-sm text-parchment outline-none focus-visible:ring-2 focus-visible:ring-gold"
          />
        </div>
        <div>
          <label htmlFor="settings-starting-debt" className="mb-1.5 block text-xs text-slate">
            Starting debt
          </label>
          <input
            id="settings-starting-debt"
            type="number"
            min={0}
            value={startingDebt}
            onChange={(e) => setStartingDebt(Number(e.target.value))}
            className="w-full rounded-lg border border-white/10 bg-night px-3 py-2 text-sm text-parchment outline-none focus-visible:ring-2 focus-visible:ring-gold"
          />
        </div>
      </div>

      <button
        type="submit"
        className="min-h-11 w-full rounded-lg bg-gold px-4 py-2.5 text-sm font-medium text-night transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      >
        Save settings
      </button>

      {/* Backups live here rather than on the daily screen. Exporting is
          something you do occasionally and deliberately; it was taking up
          room on the screen you open every morning. */}
      <div className="border-t border-hairline pt-4">
        <BackupTools />
      </div>
    </form>
  );
}
