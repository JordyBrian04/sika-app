import { COLORS } from "@/components/ui/color";
import { scale } from "@/src/utils/styling";
import { all, getOne } from "../index";
import { CategoryInput } from "./category";

export async function dayWithMostExpense(from: string, to: string) {
  return getOne<{ day: string; total: number }>(
    `SELECT date as day, SUM(amount) as total
     FROM transactions
     WHERE type = 'depense' AND date >= ? AND date <= ?
     GROUP BY date
     ORDER BY total DESC
     LIMIT 1`,
    [from, to],
  );
}

export async function dayWithLeastExpense(from: string, to: string) {
  return getOne<{ day: string; total: number }>(
    `SELECT date as day, SUM(amount) as total
     FROM transactions
     WHERE type = 'depense' AND date >= ? AND date <= ?
     GROUP BY date
     ORDER BY total ASC
     LIMIT 1`,
    [from, to],
  );
}

export async function totalsPerDay(from: string, to: string) {
  return all<{ day: string; depense: number; entree: number }>(
    `
    SELECT
      d.day as day,
      COALESCE(e.total, 0) as depense,
      COALESCE(i.total, 0) as entree
    FROM (
      SELECT date as day
      FROM transactions
      WHERE date >= ? AND date <= ?
      GROUP BY date
    ) d
    LEFT JOIN (
      SELECT date, SUM(amount) as total
      FROM transactions
      WHERE type='depense' AND date >= ? AND date <= ?
      GROUP BY date
    ) e ON e.date = d.day
    LEFT JOIN (
      SELECT date, SUM(amount) as total
      FROM transactions
      WHERE type='entree' AND date >= ? AND date <= ?
      GROUP BY date
    ) i ON i.date = d.day
    ORDER BY d.day ASC
    `,
    [from, to, from, to, from, to],
  );
}

export async function ExpenseVsIncomePerPeriod(
  periodeType: "dayly" | "monthly" | "yearly" | "weekly",
  periodeValue: string,
) {
  const barData: any = [];

  let result: any;
  switch (periodeType) {
    case "dayly":
      result = await getOne<{ total_income: number; total_expense: number }>(
        `SELECT
            type,
            strftime('%d-%m', date) as label,
            COALESCE(SUM(CASE WHEN type = 'entree' THEN amount END), 0) as total_income,
            COALESCE(SUM(CASE WHEN type = 'depense' THEN amount END), 0) as total_expense
        FROM transactions
        WHERE date = ?
        GROUP BY type, label`,
        [periodeValue],
      );

      result
        ? (Array.isArray(result) ? result : [result]).forEach((row) => {
            row.type === "entree"
              ? barData.push({
                  type: "entree",
                  label: row.label,
                  value: (row.total_income / 1000).toFixed(2),
                  frontColor: COLORS.green,
                  spacing: scale(4),
                  labelWidth: scale(30),
                })
              : barData.push({
                  type: "depense",
                  // label: row.label,
                  value: (row.total_expense / 1000).toFixed(2),
                  frontColor: COLORS.red,
                });
          })
        : barData.push(
            {
              type: "entree",
              label: new Date(periodeValue).toLocaleString("fr-FR", {
                day: "2-digit",
                month: "2-digit",
              }),
              value: 0,
              frontColor: COLORS.green,
              spacing: scale(4),
              labelWidth: scale(30),
            },
            {
              type: "depense",
              // label: new Date(periodeValue).toLocaleString("fr-FR", {
              //   day: "2-digit",
              //   month: "2-digit",
              // }),
              value: 0,
              frontColor: COLORS.red,
              // spacing: scale(4),
              // labelWidth: scale(30),
            },
          );

      break;
    case "weekly":
      const start = new Date(periodeValue.split(";")[0]);
      const end = new Date(periodeValue.split(";")[1]);

      const totalDay = Math.ceil(
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
      );

      for (let i = 0; i <= totalDay; i++) {
        const currentDate = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
        const dateStr = currentDate.toISOString().slice(0, 10);
        const labelFr = currentDate.toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
        });
        // console.log("dateStr", dateStr);

        let dayEntry = {
          label: labelFr,
          value: 0,
          frontColor: COLORS.green,
          type: "entree",
          spacing: scale(4),
          labelWidth: scale(30),
        };
        let dayExpense = {
          // label: labelFr,
          value: 0,
          frontColor: COLORS.red,
          type: "depense",
        };

        const dayResult = await all(
          `SELECT 
              type, 
              SUM(amount) as total 
          FROM transactions 
          WHERE date = ? 
          GROUP BY type`,
          [dateStr],
        );

        // console.log("dayResult", dayResult);

        if (dayResult && dayResult.length > 0) {
          dayResult.forEach((row) => {
            if (row.type === "entree") dayEntry.value = row.total / 1000;
            if (row.type === "depense") dayExpense.value = row.total / 1000;
          });
        }

        barData.push(dayEntry, dayExpense);
      }
      break;
    case "monthly":
      const year = new Date().getFullYear();
      const month = parseInt(periodeValue);

      const firstDayOfMonth = new Date(year, month - 1, 1); // 1er jour (ex: Mars est index 2)
      const lastDayOfMonth = new Date(year, month, 0); // Dernier jour

      // console.log(`Période du ${startDateStr} au ${endDateStr}`);

      const diffInTime = lastDayOfMonth.getTime() - firstDayOfMonth.getTime();
      const totalWeeks = Math.max(
        Math.ceil(diffInTime / (1000 * 3600 * 24 * 7)),
        1,
      );

      // console.log(`Total de semaines dans le mois : ${totalWeeks}`);

      for (let week = 0; week < totalWeeks; week++) {
        const weekStart = new Date(firstDayOfMonth);
        weekStart.setDate(firstDayOfMonth.getDate() + week * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        const weekNum = week + 1;

        // console.log(
        //   `Semaine ${weekNum} commence le ${weekStart.toISOString().slice(0, 10)} et se termine le ${weekEnd.toISOString().slice(0, 10)}`,
        // );

        let dayEntry = {
          label: `S${weekNum}`,
          value: 0,
          frontColor: COLORS.green,
          type: "entree",
          spacing: scale(4),
          labelWidth: scale(30),
        };
        let dayExpense = {
          // label: `S${weekNum}`,
          value: 0,
          frontColor: COLORS.red,
          type: "depense",
        };

        const dayResult = await all(
          `SELECT 
              type, 
              SUM(amount) as total 
          FROM transactions 
          WHERE date >= ? AND date <= ?
          GROUP BY type`,
          [
            weekStart.toISOString().slice(0, 10),
            weekEnd.toISOString().slice(0, 10),
          ],
        );

        if (dayResult && dayResult.length > 0) {
          dayResult.forEach((row) => {
            if (row.type === "entree") dayEntry.value = row.total / 1000;
            if (row.type === "depense") dayExpense.value = row.total / 1000;
          });
        }

        barData.push(dayEntry, dayExpense);
      }

      break;
    case "yearly":
      const monthNameShort = [
        "JAN",
        "FEV",
        "MAR",
        "AVR",
        "MAI",
        "JUI",
        "JUL",
        "AOU",
        "SEP",
        "OCT",
        "NOV",
        "DEC",
      ];

      for (let m = 1; m <= 12; m++) {
        const monthStr = m.toString().padStart(2, "0");
        // console.log(`Calcul pour le mois ${monthStr}`);

        let dayEntry = {
          label: monthNameShort[m - 1],
          value: 0,
          frontColor: COLORS.green,
          type: "entree",
          spacing: scale(4),
          labelWidth: scale(30),
        };
        let dayExpense = {
          // label: monthNameShort[m - 1],
          value: 0,
          frontColor: COLORS.red,
          type: "depense",
        };

        const dayResult = await all(
          `SELECT 
              type, 
              COALESCE(SUM(amount), 0)as total 
          FROM transactions 
          WHERE strftime('%m', date) = ?
          AND strftime('%Y', date) = ?
          GROUP BY type`,
          [monthStr, periodeValue],
        );

        if (dayResult && dayResult.length > 0) {
          dayResult.forEach((row) => {
            if (row.type === "entree") dayEntry.value = row.total / 1000;
            if (row.type === "depense") dayExpense.value = row.total / 1000;
          });
        }

        barData.push(dayEntry, dayExpense);
      }

      break;
  }

  return barData;
}

const generateRandomColor = () => {
  return (
    "#" +
    Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, "0")
  );
};

export async function getTransactionsByPeriodAndCategory(
  periodeType: "dayly" | "monthly" | "yearly" | "weekly",
  periodeValue: string,
  totalBalance: number,
) {
  let result: any;
  const categories = await all<CategoryInput>(
    `SELECT id, name FROM categories WHERE type='depense'`,
  );
  const pieDatas: any = [];
  let maxPercent = -1;
  let focusedIndex = -1;

  switch (periodeType) {
    case "dayly":
      for (let i = 0; i < categories.length; i++) {
        const cat = categories[i];
        let row = {
          label: cat.name,
          value: 0,
          color: generateRandomColor(),
          gradientCenterColor: generateRandomColor(),
        };

        result = await getOne<{ total: number }>(
          `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type='depense' AND date = ? AND category_id = ?`,
          [periodeValue, cat.id],
        );

        const total = result?.total || 0;

        const percent =
          totalBalance > 0 ? Math.round((total / totalBalance) * 100) : 0;

        // console.log("result", result, cat.name);

        if (result && result.total) {
          row.value = Math.round((result.total / totalBalance) * 100);
        }

        if (percent > maxPercent && percent > 0) {
          maxPercent = percent;
          focusedIndex = i;
        }

        // console.log("row", row);
        pieDatas.push(row);

        if (focusedIndex !== -1) {
          pieDatas[focusedIndex].focused = true;
        }
      }

      break;
    case "weekly":
      const start = new Date(periodeValue.split(";")[0]);
      const end = new Date(periodeValue.split(";")[1]);

      for (let i = 0; i < categories.length; i++) {
        const cat = categories[i];
        let row = {
          label: cat.name,
          value: 0,
          color: generateRandomColor(),
          gradientCenterColor: generateRandomColor(),
        };

        result = await getOne<{ total: number }>(
          `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type='depense' AND date >= ? AND date <= ? AND category_id = ?`,
          [
            start.toISOString().slice(0, 10),
            end.toISOString().slice(0, 10),
            cat.id,
          ],
        );

        const total = result?.total || 0;

        const percent =
          totalBalance > 0 ? Math.round((total / totalBalance) * 100) : 0;

        // console.log("result", result, cat.name);

        if (result && result.total) {
          row.value = Math.round((result.total / totalBalance) * 100);
        }

        if (percent > maxPercent && percent > 0) {
          maxPercent = percent;
          focusedIndex = i;
        }

        // console.log("row", row);
        pieDatas.push(row);

        if (focusedIndex !== -1) {
          pieDatas[focusedIndex].focused = true;
        }
      }

      // result = await all(
      //   `SELECT COALESCE(SUM(amount), 0) as total, categories.name FROM transactions LEFT JOIN categories ON transactions.category_id = categories.id WHERE transactions.type='depense' AND date >= ? AND date <= ? GROUP BY categories.name ORDER BY date DESC, transactions.id DESC`,
      //   [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)],
      // );
      break;
    case "monthly":
      const year = new Date().getFullYear();
      const month = parseInt(periodeValue);

      for (let i = 0; i < categories.length; i++) {
        const cat = categories[i];

        let row = {
          label: cat.name,
          value: 0,
          color: generateRandomColor(),
          gradientCenterColor: generateRandomColor(),
          focused: false,
        };

        result = await getOne<{ total: number }>(
          `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type='depense' AND strftime('%m', date) = ? AND strftime('%Y', date) = ? AND category_id = ?`,
          [month.toString().padStart(2, "0"), year.toString(), cat.id],
        );

        const total = result?.total || 0;

        const percent =
          totalBalance > 0 ? Math.round((total / totalBalance) * 100) : 0;

        // console.log("result", result, cat.name);

        if (result && result.total) {
          row.value = Math.round((result.total / totalBalance) * 100);
        }

        if (percent > maxPercent && percent > 0) {
          maxPercent = percent;
          focusedIndex = i;
        }

        // console.log("row", row);
        pieDatas.push(row);

        if (focusedIndex !== -1) {
          pieDatas[focusedIndex].focused = true;
        }
      }
      break;
    case "yearly":
      for (let i = 0; i < categories.length; i++) {
        const cat = categories[i];

        let row = {
          label: cat.name,
          value: 0,
          color: generateRandomColor(),
          gradientCenterColor: generateRandomColor(),
          focused: false,
        };

        result = await getOne<{ total: number }>(
          `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type='depense' AND strftime('%Y', date) = ? AND category_id = ?`,
          [periodeValue.toString(), cat.id],
        );

        const total = result?.total || 0;

        const percent =
          totalBalance > 0 ? Math.round((total / totalBalance) * 100) : 0;

        // console.log("result", result, cat.name);

        if (result && result.total) {
          row.value = Math.round((result.total / totalBalance) * 100);
        }

        if (percent > maxPercent && percent > 0) {
          maxPercent = percent;
          focusedIndex = i;
        }

        // console.log("row", row);
        pieDatas.push(row);

        if (focusedIndex !== -1) {
          pieDatas[focusedIndex].focused = true;
        }
      }
      break;
  }

  return pieDatas;
}
