"use client";

import { PiggyBank, TrendingDown, Trash2 } from "lucide-react";
import { useState } from "react";
import { debtRemaining, formatMoney, savingsTotal, transactionsForAccount } from "@/domain/finance";
import { MoneyAccount, MoneyTransactionType } from "@/persistence/types";
import { useTracker } from "@/providers/TrackerProvider";
import { AnimatedNumber } from "./AnimatedNumber";

const CONFIG: Record<
  MoneyAccount,
  { title: string; icon: typeof PiggyBank; addTypes: [MoneyTransactionType, string][]; barColor: string }
> = {
  savings: {
    title: "Money kept, not spent",
    icon: PiggyBank,
    addTypes: [
      ["saving", "Add savings"],
      ["withdrawal", "Withdraw"],
    ],
    barColor: "var(--color-gold)",
  },
  debt: {
    title: "Debt remaining",
    icon: TrendingDown,
    addTypes: [
      ["debt-payment", "Pay down"],
      ["debt-increase", "Add debt"],
    ],
    barColor: "var(--color-green)",
  },
};

export function MoneyAccountCard({ account }: { account: MoneyAccount }) {
  const { state, today, addTransaction, deleteTransaction } = useTracker();
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<MoneyTransactionType>(CONFIG[account].addTypes[0][0]);
  const [note, setNote] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  if (!state) return null;

  const { title, icon: Icon, addTypes, barColor } = CONFIG[account];
  const currency = state.settings.money.currency;
  const locale = state.settings.locale;

  const balance =
    account === "savings"
      ? savingsTotal(state.money.transactions)
      : debtRemaining(state.money.transactions, state.settings.money.startingDebt);
  const goal = account === "savings" ? state.settings.money.savingsGoal : state.settings.money.startingDebt;
  const pct = account === "savings" ? Math.min(100, Math.round((balance / Math.max(1, goal)) * 100)) : Math.min(100, Math.max(0, Math.round(((goal - balance) / Math.max(1, goal)) * 100)));
  const history = transactionsForAccount(state.money.transactions, account);
  const isDebtFree = account === "debt" && balance <= 0;

  /*
    Clearing the debt is worth celebrating, but it isn't the end of the
    account: debt gets taken on again, and a card that hides its form at zero
    leaves no way to record that. So the debt-free note is shown alongside the
    form rather than in place of it.

    Paying down nothing is the one entry that can't mean anything at zero — it
    would write a transaction the balance clamp then swallows — so that option
    alone is disabled, and "Add debt" stands in for it until there is a
    balance to pay down again.
  */
  const payDownDisabled = isDebtFree;
  const effectiveType: MoneyTransactionType =
    payDownDisabled && type === "debt-payment" ? "debt-increase" : type;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (Number.isFinite(value) && value > 0) {
      addTransaction({ type: effectiveType, amount: value, date: today, note: note.trim() || undefined });
      setAmount("");
      setNote("");
    }
  }

  return (
    <section aria-label={title} className="rounded-2xl border border-white/10 bg-panel p-5">
      <div className="flex items-center gap-2">
        <Icon size={16} className={account === "savings" ? "text-gold" : "text-clay"} aria-hidden="true" />
        <h2 className="font-display text-lg text-parchment">{title}</h2>
      </div>

      <p className={`mt-2 font-numeric text-2xl ${account === "savings" ? "text-parchment" : "text-clay"}`}>
        <AnimatedNumber value={balance} /> <span className="text-sm text-slate">/ {formatMoney(goal, currency, locale)}</span>
      </p>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-night">
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: barColor }} />
      </div>

      {isDebtFree && (
        <p className="mt-4 text-sm text-green">Debt-free. Everything you add now is yours to keep.</p>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-2">
        <div className="flex gap-2">
          {addTypes.map(([t, label]) => {
            const disabled = t === "debt-payment" && payDownDisabled;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                disabled={disabled}
                title={disabled ? "Nothing left to pay down" : undefined}
                aria-pressed={effectiveType === t}
                className={`min-h-9 flex-1 rounded-lg border px-2 py-1.5 text-xs transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  effectiveType === t ? "border-gold/60 bg-gold/15 text-gold" : "border-white/10 text-slate hover:text-parchment"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <label className="sr-only" htmlFor={`${account}-amount`}>
            Amount
          </label>
          <input
            id={`${account}-amount`}
            type="number"
            min={1}
            step="any"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`Amount (${currency})`}
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-night px-3.5 py-2 text-sm text-parchment placeholder:text-slate/60 outline-none focus-visible:ring-2 focus-visible:ring-gold"
          />
          <button
            type="submit"
            className="min-h-9 shrink-0 rounded-lg bg-gold px-4 py-2 text-sm font-medium text-night transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            Add
          </button>
        </div>
      </form>

      <button
        type="button"
        onClick={() => setShowHistory((v) => !v)}
        aria-expanded={showHistory}
        className="mt-3 text-xs text-slate underline decoration-slate/40 underline-offset-2 hover:text-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded"
      >
        {showHistory ? "Hide history" : `Transaction history (${history.length})`}
      </button>

      {showHistory && (
        <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto border-t border-white/10 pt-2">
          {history.length === 0 && <li className="text-xs text-slate">No transactions yet.</li>}
          {history.map((tx) => (
            <li key={tx.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="text-slate">
                {tx.date} · {tx.type.replace("-", " ")} · {formatMoney(tx.amount, currency, locale)}
                {tx.note ? ` · ${tx.note}` : ""}
              </span>
              <button
                type="button"
                onClick={() => deleteTransaction(tx.id)}
                aria-label={`Remove transaction from ${tx.date}`}
                className="shrink-0 rounded p-1 text-slate/50 hover:text-clay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                <Trash2 size={11} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
