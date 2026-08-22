import { describe, expect, it } from "vitest";
import { createTransaction, debtRemaining, savingsTotal } from "./finance";
import { MoneyTransaction } from "@/persistence/types";

const NOW = "2026-01-05T10:00:00.000Z";

describe("finance ledger", () => {
  it("derives savings total from saving/withdrawal transactions, never negative", () => {
    const txs: MoneyTransaction[] = [
      createTransaction({ type: "saving", amount: 500, date: "2026-01-01" }, undefined, NOW),
      createTransaction({ type: "saving", amount: 300, date: "2026-01-02" }, undefined, NOW),
      createTransaction({ type: "withdrawal", amount: 200, date: "2026-01-03" }, undefined, NOW),
    ];
    expect(savingsTotal(txs)).toBe(600);
  });

  it("clamps savings at zero even if withdrawals exceed deposits", () => {
    const txs: MoneyTransaction[] = [
      createTransaction({ type: "saving", amount: 100, date: "2026-01-01" }, undefined, NOW),
      createTransaction({ type: "withdrawal", amount: 500, date: "2026-01-02" }, undefined, NOW),
    ];
    expect(savingsTotal(txs)).toBe(0);
  });

  it("derives debt remaining from an opening balance plus payments/increases", () => {
    const txs: MoneyTransaction[] = [
      createTransaction({ type: "debt-payment", amount: 300, date: "2026-01-01" }, undefined, NOW),
      createTransaction({ type: "debt-increase", amount: 50, date: "2026-01-02" }, undefined, NOW),
    ];
    expect(debtRemaining(txs, 1000)).toBe(750);
  });

  it("clamps debt at zero once fully paid off", () => {
    const txs: MoneyTransaction[] = [
      createTransaction({ type: "debt-payment", amount: 2000, date: "2026-01-01" }, undefined, NOW),
    ];
    expect(debtRemaining(txs, 1000)).toBe(0);
  });

  it("adjustment transactions apply a signed delta to the given account", () => {
    const txs: MoneyTransaction[] = [
      createTransaction({ type: "adjustment", amount: 250, date: "2026-01-01" }, "savings", NOW),
    ];
    expect(savingsTotal(txs)).toBe(250);
  });
});
