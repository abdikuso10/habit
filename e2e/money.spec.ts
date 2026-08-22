import { expect, test } from "@playwright/test";
import { createAccount, readState, seedState } from "./helpers";

/*
  The money cards are a ledger, not a pair of counters: every balance is
  derived by replaying transactions over an opening balance. These tests drive
  the cards the way a user does and then assert on what was actually written,
  because a card that displays the right number from a wrong ledger looks fine
  until the next import.
*/
test.describe("debt account", () => {
  test("debt can be paid down and taken on again", async ({ page }) => {
    await createAccount(page);
    await seedState(page, (state) => ({
      ...state,
      settings: { ...state.settings, money: { ...state.settings.money, startingDebt: 30000 } },
    }));

    const debt = page.getByRole("region", { name: "Debt remaining" });
    const amount = debt.getByLabel("Amount");
    const submit = debt.getByRole("button", { name: "Add", exact: true });

    await debt.getByRole("button", { name: "Pay down" }).click();
    await amount.fill("10000");
    await submit.click();
    await expect(async () => {
      expect(await page.evaluate(() => document.body.innerText)).toContain("20,000");
    }).toPass();

    await debt.getByRole("button", { name: "Add debt" }).click();
    await amount.fill("5000");
    await submit.click();
    await expect(async () => {
      const s = await readState();
      expect(s?.money.transactions.filter((t) => t.account === "debt")).toHaveLength(2);
    }).toPass();

    const s = await readState();
    const debtTx = s!.money.transactions.filter((t) => t.account === "debt");
    expect(debtTx.map((t) => t.type).sort()).toEqual(["debt-increase", "debt-payment"]);
  });

  /*
    Reaching zero is not the end of the account. The card used to replace its
    whole form with the debt-free message, which left no way to record debt
    taken on afterwards — the balance was stuck at zero for good.
  */
  test("at zero the form stays usable, and only pay-down is withheld", async ({ page }) => {
    await createAccount(page); // startingDebt defaults to 0

    const debt = page.getByRole("region", { name: "Debt remaining" });
    await expect(debt.getByText("Debt-free")).toBeVisible();
    await expect(debt.getByRole("button", { name: "Pay down" })).toBeDisabled();
    await expect(debt.getByRole("button", { name: "Add debt" })).toHaveAttribute("aria-pressed", "true");

    await debt.getByLabel("Amount").fill("4000");
    await debt.getByRole("button", { name: "Add", exact: true }).click();

    await expect(async () => {
      const s = await readState();
      const tx = s?.money.transactions.filter((t) => t.account === "debt") ?? [];
      expect(tx).toHaveLength(1);
      expect(tx[0]).toMatchObject({ type: "debt-increase", amount: 4000 });
    }).toPass();

    await expect(debt.getByRole("button", { name: "Pay down" })).toBeEnabled();
    await expect(debt.getByText("Debt-free")).toHaveCount(0);
  });
});
