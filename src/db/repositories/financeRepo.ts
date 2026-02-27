import { getOne } from "..";

export async function getTotalBalance() {
  const result = await getOne<{ total_income: number; total_expense: number }>(
    `SELECT
            COALESCE(SUM(CASE WHEN type = 'entree' THEN amount END), 0) as total_income,
            COALESCE(SUM(CASE WHEN type = 'depense' THEN amount END), 0) as total_expense
        FROM transactions;`,
  );

  const income = result?.total_income ?? 0;
  const expense = result?.total_expense ?? 0;
  return {
    income,
    expense,
    balance: income - expense,
  };
}

export async function getPeriodiqueTotalBalance(
  periodeType: "dayly" | "monthly" | "yearly" | "weekly",
  periodeValue: string,
) {
  let result: any;

  // console.log("getPeriodiqueTotalBalance", { periodeType, periodeValue });
  if (periodeType === "weekly") {
    console.log(
      "periodeValue",
      periodeValue.split(";")[0],
      periodeValue.split(";")[1],
    );
  }

  switch (periodeType) {
    case "dayly":
      result = await getOne<{ total_income: number; total_expense: number }>(
        `SELECT
            COALESCE(SUM(CASE WHEN type = 'entree' THEN amount END), 0) as total_income,
            COALESCE(SUM(CASE WHEN type = 'depense' THEN amount END), 0) as total_expense
        FROM transactions
        WHERE date = ?`,
        [periodeValue],
      );
      break;
    case "monthly":
      result = await getOne<{ total_income: number; total_expense: number }>(
        `SELECT
            COALESCE(SUM(CASE WHEN type = 'entree' THEN amount END), 0) as total_income,
            COALESCE(SUM(CASE WHEN type = 'depense' THEN amount END), 0) as total_expense
        FROM transactions
        WHERE strftime('%m', date) = ? AND strftime('%Y', date) = ?`,
        [periodeValue, new Date().getFullYear().toString()],
      );
      break;
    case "yearly":
      result = await getOne<{ total_income: number; total_expense: number }>(
        `SELECT
            COALESCE(SUM(CASE WHEN type = 'entree' THEN amount END), 0) as total_income,
            COALESCE(SUM(CASE WHEN type = 'depense' THEN amount END), 0) as total_expense
        FROM transactions
        WHERE strftime('%Y', date) = ?`,
        [periodeValue],
      );
      break;
    case "weekly":
      result = await getOne<{ total_income: number; total_expense: number }>(
        `SELECT
            COALESCE(SUM(CASE WHEN type = 'entree' THEN amount END), 0) as total_income,
            COALESCE(SUM(CASE WHEN type = 'depense' THEN amount END), 0) as total_expense
        FROM transactions
        WHERE date >= ? AND date <= ?`,
        [periodeValue.split(";")[0], periodeValue.split(";")[1]],
      );
      break;
    default:
      result = await getOne<{ total_income: number; total_expense: number }>(
        `SELECT
            COALESCE(SUM(CASE WHEN type = 'entree' THEN amount END), 0) as total_income,
            COALESCE(SUM(CASE WHEN type = 'depense' THEN amount END), 0) as total_expense
        FROM transactions;`,
      );
      break;
  }

  const income = result?.total_income ?? 0;
  const expense = result?.total_expense ?? 0;
  return {
    income,
    expense,
    balance: income - expense,
  };
}

export async function getMonthlyExpense() {
  const currentMonth = new Date().getMonth() + 1; // getMonth() is 0-indexed
  const currentYear = new Date().getFullYear();
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
  const totalBudget = budgetRow?.total_limit_amount ?? 0;
  const percentageUsed =
    totalBudget > 0 ? (totalExpense / totalBudget) * 100 : 0;
  const remainingBudget = Math.max(totalBudget - totalExpense, 0);

  return {
    totalExpense: totalExpense,
    totalBudget: totalBudget,
    percentageUsed: percentageUsed,
    remainingBudget: remainingBudget,
  };
}
