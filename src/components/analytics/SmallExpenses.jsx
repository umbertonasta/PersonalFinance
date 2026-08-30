import { useMemo } from "react";
import { Coins, ChevronRight } from "lucide-react";
import { inRange } from "@/lib/dateRanges";
const euro = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});
export default function SmallExpenses({
  transactions,
  taxonomy,
  range,
  compareRange,
  threshold = 10,
  onOpen,
}) {
  const model = useMemo(() => {
    const get = (r) =>
      r
        ? transactions.filter(
            (x) =>
              x.type === "expense" &&
              Number(x.amount) < threshold &&
              inRange(x.date, r),
          )
        : [];
    const rows = get(range),
      comparison = get(compareRange);
    const total = rows.reduce((s, x) => s + Number(x.amount), 0),
      comparisonTotal = comparison.reduce((s, x) => s + Number(x.amount), 0);
    const all = transactions
      .filter((x) => x.type === "expense" && inRange(x.date, range))
      .reduce((s, x) => s + Number(x.amount), 0);
    const subMap = new Map(
      (taxonomy?.subcategories || []).map((x) => [x.id, x]),
    );
    const groups = new Map();
    rows.forEach((x) => {
      const key = x.subcategory_id || "none",
        name = subMap.get(x.subcategory_id)?.name || "Senza sottocategoria";
      const g = groups.get(key) || { name, count: 0, rows: [] };
      g.count++;
      g.rows.push(x);
      groups.set(key, g);
    });
    return {
      rows,
      total,
      count: rows.length,
      average: rows.length ? total / rows.length : 0,
      share: all ? (total / all) * 100 : 0,
      change: comparisonTotal
        ? ((total - comparisonTotal) / comparisonTotal) * 100
        : null,
      subcategories: [...groups.values()]
        .sort((a, b) => b.count - a.count)
        .slice(0, 3),
    };
  }, [transactions, taxonomy, range, compareRange, threshold]);
  return (
    <button
      onClick={() =>
        onOpen({ title: `Spese sotto ${threshold} €`, rows: model.rows })
      }
      className="w-full rounded-[1.75rem] border border-white/70 bg-white/80 p-5 text-left shadow-sm dark:border-white/10 dark:bg-slate-900/80 sm:p-6"
    >
      <Coins />
      <h3 className="mt-4 text-lg font-black">Piccole spese frequenti</h3>
      <p className="text-sm text-slate-400">
        Operazioni inferiori a {threshold} € raggruppate per sottocategoria
      </p>
      <b className="mt-4 block text-2xl">{euro.format(model.total)}</b>
      <p className="text-xs text-slate-400">
        {model.count} movimenti · media {euro.format(model.average)} ·{" "}
        {model.share.toFixed(0)}% delle spese
      </p>
      {model.change != null && (
        <p className={model.change > 0 ? "text-rose-500" : "text-emerald-500"}>
          {model.change > 0 ? "+" : ""}
          {model.change.toFixed(0)}% rispetto al confronto
        </p>
      )}
      <div className="mt-4 space-y-2">
        {model.subcategories.map((x) => (
          <div key={x.name} className="flex justify-between">
            <span>{x.name}</span>
            <b>{x.count}</b>
          </div>
        ))}
      </div>
      <ChevronRight className="ml-auto mt-3" />
    </button>
  );
}
