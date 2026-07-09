"use client";

import { TrendingDown } from "lucide-react";
import { useState } from "react";
import { STARTING_DEBT } from "@/lib/types";
import { useTracker } from "@/lib/TrackerContext";
import { AnimatedNumber } from "./AnimatedNumber";

export function DebtTracker() {
  const { state, payDebt } = useTracker();
  const [amount, setAmount] = useState("");

  if (!state) return null;

  const paidOffPct = Math.min(
    100,
    Math.round(((STARTING_DEBT - state.debtRemaining) / STARTING_DEBT) * 100)
  );
  const isDebtFree = state.debtRemaining <= 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (Number.isFinite(value) && value > 0) {
      payDebt(value);
      setAmount("");
    }
  }

  return (
    <section
      aria-label="Debt"
      className="rounded-2xl border border-white/10 bg-panel p-5"
    >
      <div className="flex items-center gap-2">
        <TrendingDown size={16} className="text-clay" aria-hidden="true" />
        <h2 className="font-display text-lg text-parchment">
          Debt remaining
        </h2>
      </div>

      <p className="mt-2 font-numeric text-2xl text-clay">
        <AnimatedNumber value={state.debtRemaining} />{" "}
        <span className="text-sm text-slate">
          / {STARTING_DEBT.toLocaleString()} shillings
        </span>
      </p>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-night">
        <div
          className="h-full rounded-full bg-green transition-all duration-300"
          style={{ width: `${paidOffPct}%` }}
        />
      </div>

      {isDebtFree ? (
        <p className="mt-4 text-sm text-green">
          Debt-free. Everything you pay now is yours to keep.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
          <input
            type="number"
            min={1}
            step="any"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount paid today"
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-night px-3.5 py-2 text-sm text-parchment placeholder:text-slate/60 outline-none focus-visible:ring-2 focus-visible:ring-gold"
          />
          <button
            type="submit"
            className="shrink-0 rounded-lg bg-clay px-4 py-2 text-sm font-medium text-parchment transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay"
          >
            Pay
          </button>
        </form>
      )}
    </section>
  );
}
