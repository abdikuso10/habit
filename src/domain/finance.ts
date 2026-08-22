// Savings and debt are derived from a transaction ledger, never from a
// running total, so re-imports and edits can never drift from history.

import { MoneyAccount, MoneySettings, MoneyTransaction, MoneyTransactionType } from "@/persistence/types";

export function generateTransactionId(): string {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `tx-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export interface CreateTransactionInput {
  date: string;
  type: MoneyTransactionType;
  amount: number;
  note?: string;
}

const ACCOUNT_BY_TYPE: Record<Exclude<MoneyTransactionType, "adjustment">, MoneyAccount> = {
  saving: "savings",
  withdrawal: "savings",
  "debt-payment": "debt",
  "debt-increase": "debt",
};

export function createTransaction(
  input: CreateTransactionInput,
  account: MoneyAccount | undefined,
  nowIso: string
): MoneyTransaction {
  const resolvedAccount =
    input.type === "adjustment" ? account ?? "savings" : ACCOUNT_BY_TYPE[input.type];
  return {
    id: generateTransactionId(),
    date: input.date,
    createdAt: nowIso,
    type: input.type,
    account: resolvedAccount,
    amount: input.amount,
    note: input.note?.trim() || undefined,
  };
}

function signedEffect(tx: MoneyTransaction): number {
  switch (tx.type) {
    case "saving":
    case "debt-increase":
      return Math.abs(tx.amount);
    case "withdrawal":
    case "debt-payment":
      return -Math.abs(tx.amount);
    case "adjustment":
      return tx.amount;
  }
}

/** Raw (unclamped) running total for one account, as of the ledger given. */
export function rawAccountTotal(
  transactions: MoneyTransaction[],
  account: MoneyAccount,
  openingBalance: number
): number {
  return transactions
    .filter((tx) => tx.account === account)
    .reduce((sum, tx) => sum + signedEffect(tx), openingBalance);
}

export function savingsTotal(transactions: MoneyTransaction[]): number {
  return Math.max(0, rawAccountTotal(transactions, "savings", 0));
}

export function debtRemaining(transactions: MoneyTransaction[], startingDebt: number): number {
  return Math.max(0, rawAccountTotal(transactions, "debt", startingDebt));
}

export function savingsProgressPct(transactions: MoneyTransaction[], goal: number): number {
  if (goal <= 0) return 0;
  return Math.min(100, Math.round((savingsTotal(transactions) / goal) * 100));
}

export function debtProgressPct(transactions: MoneyTransaction[], settings: MoneySettings): number {
  if (settings.startingDebt <= 0) return 100;
  const remaining = debtRemaining(transactions, settings.startingDebt);
  return Math.min(100, Math.max(0, Math.round(((settings.startingDebt - remaining) / settings.startingDebt) * 100)));
}

export function transactionsForAccount(
  transactions: MoneyTransaction[],
  account: MoneyAccount
): MoneyTransaction[] {
  return transactions
    .filter((tx) => tx.account === account)
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}

export function formatMoney(amount: number, currency: string, locale = "en"): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${Math.round(amount).toLocaleString(locale)} ${currency}`;
  }
}
