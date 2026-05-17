// Safe-to-spend calculator

export class SafeSpendCalculator {
  /**
   * Calculate how much the user can safely spend right now.
   *
   * @param accountBalanceCents    Total across all accounts (cents)
   * @param upcomingBillsCents     Sum of known upcoming bill amounts (cents)
   * @param reservedBudgetCents    Amount already earmarked in budget envelopes (cents)
   */
  static calculate(
    accountBalanceCents: number,
    upcomingBillsCents: number,
    reservedBudgetCents: number,
  ): { safeToSpend: number; upcomingBills: number; accountBalance: number } {
    const safeToSpend = Math.max(
      0,
      accountBalanceCents - upcomingBillsCents - reservedBudgetCents,
    )
    return {
      safeToSpend,
      upcomingBills: upcomingBillsCents,
      accountBalance: accountBalanceCents,
    }
  }

  /** Convert dollars (float) to cents (int) */
  static toCents(dollars: number): number {
    return Math.round(dollars * 100)
  }

  /** Format cents as a display string, e.g. 12340 → "$123.40" */
  static format(cents: number, currency = 'USD'): string {
    const abs = Math.abs(cents)
    const str = (abs / 100).toFixed(2)
    return cents < 0 ? `-${currency} ${str}` : `${currency} ${str}`
  }
}
