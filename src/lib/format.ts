/** Format hours — shows decimals only when needed: 2 → "2h", 1.5 → "1.5h" */
export function fmtHours(n: number): string {
  const v = parseFloat(n.toFixed(1));
  return `${v}h`;
}

/** Format dollar value — always rounds to whole dollars */
export function fmtDollars(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}
