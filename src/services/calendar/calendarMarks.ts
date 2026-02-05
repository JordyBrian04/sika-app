import type { DaySpend } from "../../db/repositories/calendarRepo";

export function buildMarks(items: DaySpend[]) {
  // calc max pour faire une intensité (simple)
  const max = Math.max(1, ...items.map((i) => i.total));

  const marks: Record<string, any> = {};
  for (const it of items) {
    const ratio = it.total / max; // 0..1
    // on fait 3 niveaux (simple)
    const level = ratio > 0.66 ? 3 : ratio > 0.33 ? 2 : 1;

    marks[it.day] = {
      customStyles: {
        container: {
          borderRadius: 10,
          backgroundColor:
            level === 3 ? "#ffb3b3" : level === 2 ? "#ffd9b3" : "#e6f0ff",
        },
        text: { color: "#111", fontWeight: "700" },
      },
      // on garde aussi le montant pour afficher au clic
      _total: it.total,
    };
  }
  return marks;
}
