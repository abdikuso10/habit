"use client";

import { PiggyBank } from "lucide-react";
import { useState } from "react";
import { SAVINGS_GOAL } from "@/lib/types";
import { useTracker } from "@/lib/TrackerContext";
import { AnimatedNumber } from "./AnimatedNumber";

export function SavingsTracker() {
  const { state, addSavings } = useTracker();
  const [amount, setAmount] = useState("");

  if (!state) return null;

  const pct = Math.min(
    100,
    Math.round((state.savingsTotal / SAVINGS_GOAL) * 100)
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (Number.isFinite(value) && value > 0) {
      addSavings(value);
      setAmount("");
    }
  }

  return (
    <section
      aria-label="Savings"
      className="rounded-2xl border border-white/10 bg-panel p-5"
    >
      <div className="flex items-center gap-2">
        <PiggyBank size={16} className="text-gold" aria-hidden="true" />
        <h2 className="font-display text-lg text-parchment">
          Money kept, not spent
        </h2>
      </div>

      <p className="mt-2 font-numeric text-2xl text-parchment">
        <AnimatedNumber value={state.savingsTotal} />{" "}
        <span className="text-sm text-slate">
          / {SAVINGS_GOAL.toLocaleString()} shillings
        </span>
      </p>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-night">
        <div
          className="h-full rounded-full bg-gold transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <input
          type="number"
          min={1}
          step="any"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount saved today"
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-night px-3.5 py-2 text-sm text-parchment placeholder:text-slate/60 outline-none focus-visible:ring-2 focus-visible:ring-gold"
        />
        <button
          type="submit"
          className="shrink-0 rounded-lg bg-gold px-4 py-2 text-sm font-medium text-night transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          Add
        </button>
      </form>
    </section>
  );
}
