export function formatMoney(v: string) {
  const n = Number(v || 0);
  if (!Number.isFinite(n)) return "0";
  return Math.trunc(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
