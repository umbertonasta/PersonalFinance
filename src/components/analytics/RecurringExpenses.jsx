import { useMemo } from "react";
import { Repeat2, ChevronRight } from "lucide-react";
import { inRange } from "@/lib/dateRanges";
const euro = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});
export default function RecurringExpenses({
  transactions,
  taxonomy,
  range,
  onOpen,
}) {
  const model = useMemo(() => {
    const subMap = new Map(
      (taxonomy?.subcategories || []).map((x) => [x.id, x]),
    );
    const groups = new Map();
    transactions
      .filter(
        (x) =>
          x.type === "expense" && x.subcategory_id && inRange(x.date, range),
      )
      .forEach((x) => {
        const key = x.subcategory_id;
        const g = groups.get(key) || {
          name: subMap.get(key)?.name || "Sottocategoria",
          rows: [],
        };
        g.rows.push(x);
        groups.set(key, g);
      });
    const items = [...groups.values()]
      .filter((g) => g.rows.length >= 2)
      .map((g) => {
        const amounts = g.rows.map((x) => Number(x.amount));
        const average = amounts.reduce((a, b) => a + b, 0) / amounts.length;
        const stable = amounts.every(
          (a) => Math.abs(a - average) <= Math.max(2, average * 0.18),
        );
        return { ...g, average, stable };
      })
      .filter((x) => x.stable)
      .sort((a, b) => b.average - a.average);
    return {
      items,
      total: items.reduce((s, x) => s + x.average, 0),
      rows: items.flatMap((x) => x.rows),
    };
  }, [transactions, taxonomy, range]);
  return (
    <button
      onClick={() =>
        onOpen({
          title: "Ricorrenze stimate per sottocategoria",
          rows: model.rows,
        })
      }
      className="w-full rounded-[1.75rem] border border-white/70 bg-white/80 p-5 text-left shadow-sm dark:border-white/10 dark:bg-slate-900/80 sm:p-6"
    >
      <Repeat2 />
      <h3 className="mt-4 text-lg font-black">Spese ricorrenti stimate</h3>
      <p className="text-sm text-slate-400">
        Raggruppate per sottocategoria, non per esercente
      </p>
      <b className="mt-4 block text-2xl">{euro.format(model.total)}</b>
      <p className="text-xs text-slate-400">
        {model.items.length} possibili ricorrenze nel periodo
      </p>
      <div className="mt-4 space-y-2">
        {model.items.slice(0, 3).map((x) => (
          <div key={x.name} className="flex justify-between">
            <span>{x.name}</span>
            <b>~{euro.format(x.average)}</b>
          </div>
        ))}
      </div>
      <ChevronRight className="ml-auto mt-3" />
    </button>
  );
}
