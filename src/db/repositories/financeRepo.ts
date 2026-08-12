import { getOne } from "..";

/**
 * Solde global (tout historique).
 * balance = revenus - dépenses - contributions épargne + retraits épargne
 *
 * Les contributions épargne sont lues depuis goal_contributions (pas dans transactions)
 * pour ne pas polluer les stats de dépenses par catégorie ni déclencher les alertes budget.
 * Quand une contribution est supprimée, le solde remonte automatiquement.
 */
export async function getTotalBalance() {
  const result = await getOne<{
    total_income: number;
    total_expense: number;
    total_savings: number;
  }>(
    `SELECT
      COALESCE(SUM(CASE WHEN type = 'entree' THEN amount END), 0) as total_income,
      COALESCE(SUM(CASE WHEN type = 'depense' THEN amount END), 0) as total_expense,
      (SELECT COALESCE(SUM(amount), 0) FROM goal_contributions) as total_savings
    FROM transactions;`,
  );

  const income  = result?.total_income  ?? 0;
  const expense = result?.total_expense ?? 0;
  const savings = result?.total_savings ?? 0;
  return {
    income,
    expense,
    savings,
    balance: income - expense - savings,
  };
}

/**
 * Solde sur une période donnée.
 * Les contributions épargne sont filtrées sur la même période.
 */
export async function getPeriodiqueTotalBalance(
  periodeType: "dayly" | "monthly" | "yearly" | "weekly",
  periodeValue: string,
) {
  let result: any;

  switch (periodeType) {
    case "dayly":
      result = await getOne<{ total_income: number; total_expense: number; total_savings: number }>(
        `SELECT
          COALESCE(SUM(CASE WHEN type = 'entree' THEN amount END), 0) as total_income,
          COALESCE(SUM(CASE WHEN type = 'depense' THEN amount END), 0) as total_expense,
          (SELECT COALESCE(SUM(amount), 0) FROM goal_contributions WHERE date = ?) as total_savings
        FROM transactions
        WHERE date = ?`,
        [periodeValue, periodeValue],
      );
      break;

    case "monthly":
      result = await getOne<{ total_income: number; total_expense: number; total_savings: number }>(
        `SELECT
          COALESCE(SUM(CASE WHEN type = 'entree' THEN amount END), 0) as total_income,
          COALESCE(SUM(CASE WHEN type = 'depense' THEN amount END), 0) as total_expense,
          (SELECT COALESCE(SUM(amount), 0) FROM goal_contributions
           WHERE strftime('%m', date) = ? AND strftime('%Y', date) = ?) as total_savings
        FROM transactions
        WHERE strftime('%m', date) = ? AND strftime('%Y', date) = ?`,
        [periodeValue, new Date().getFullYear().toString(),
         periodeValue, new Date().getFullYear().toString()],
      );
      break;

    case "yearly":
      result = await getOne<{ total_income: number; total_expense: number; total_savings: number }>(
        `SELECT
          COALESCE(SUM(CASE WHEN type = 'entree' THEN amount END), 0) as total_income,
          COALESCE(SUM(CASE WHEN type = 'depense' THEN amount END), 0) as total_expense,
          (SELECT COALESCE(SUM(amount), 0) FROM goal_contributions
           WHERE strftime('%Y', date) = ?) as total_savings
        FROM transactions
        WHERE strftime('%Y', date) = ?`,
        [periodeValue, periodeValue],
      );
      break;

    case "weekly": {
      const [dateFrom, dateTo] = periodeValue.split(";");
      result = await getOne<{ total_income: number; total_expense: number; total_savings: number }>(
        `SELECT
          COALESCE(SUM(CASE WHEN type = 'entree' THEN amount END), 0) as total_income,
          COALESCE(SUM(CASE WHEN type = 'depense' THEN amount END), 0) as total_expense,
          (SELECT COALESCE(SUM(amount), 0) FROM goal_contributions
           WHERE date >= ? AND date <= ?) as total_savings
        FROM transactions
        WHERE date >= ? AND date <= ?`,
        [dateFrom, dateTo, dateFrom, dateTo],
      );
      break;
    }

    default:
      result = await getOne<{ total_income: number; total_expense: number; total_savings: number }>(
        `SELECT
          COALESCE(SUM(CASE WHEN type = 'entree' THEN amount END), 0) as total_income,
          COALESCE(SUM(CASE WHEN type = 'depense' THEN amount END), 0) as total_expense,
          (SELECT COALESCE(SUM(amount), 0) FROM goal_contributions) as total_savings
        FROM transactions;`,
      );
      break;
  }

  const income  = result?.total_income  ?? 0;
  const expense = result?.total_expense ?? 0;
  const savings = result?.total_savings ?? 0;
  return {
    income,
    expense,
    savings,
    balance: income - expense - savings,
  };
}

/**
 * Dépenses du mois courant (budgets).
 * N'inclut PAS les contributions épargne — les budgets ne sont pas affectés.
 */
export async function getMonthlyExpense() {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear  = new Date().getFullYear();

  const row = await getOne<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total
     FROM transactions
     WHERE type = 'depense'
       AND strftime('%m', date) = ?
       AND strftime('%Y', date) = ?`,
    [currentMonth.toString().padStart(2, "0"), currentYear.toString()],
  );

  const budgetRow = await getOne<{ total_limit_amount: number }>(
    `SELECT COALESCE(SUM(limit_amount), 0) as total_limit_amount
     FROM budgets
     WHERE month = ? AND year = ?`,
    [currentMonth.toString().padStart(2, "0"), currentYear.toString()],
  );

  const totalExpense = row?.total ?? 0;
  const totalBudget  = budgetRow?.total_limit_amount ?? 0;
  const percentageUsed   = totalBudget > 0 ? (totalExpense / totalBudget) * 100 : 0;
  const remainingBudget  = Math.max(totalBudget - totalExpense, 0);

  return { totalExpense, totalBudget, percentageUsed, remainingBudget };
}
