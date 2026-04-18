// Indian currency formatting (lakh / crore commas)
export function formatINR(value, opts = {}) {
  const n = Number(value || 0);
  const showPaise = opts.paise === true;
  const fixed = showPaise ? n.toFixed(2) : Math.round(n).toString();
  const [intPart, decPart] = fixed.split(".");
  // Indian grouping: last 3 digits then groups of 2
  let x = intPart;
  const lastThree = x.slice(-3);
  const rest = x.slice(0, -3);
  const formatted =
    rest !== ""
      ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree
      : lastThree;
  return decPart ? `₹${formatted}.${decPart}` : `₹${formatted}`;
}

export function shortDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
