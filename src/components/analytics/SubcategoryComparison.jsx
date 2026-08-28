import { useMemo } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { inRange } from "@/lib/dateRanges";

const euro = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});

function totalBySubcategory(rows, range, categoryId) {
  const totals = new Map();
  if (!range) return totals;

  rows
    .filter(
      (item) =>
        item.type === "expense" &&
        item.category_id === categoryId &&
        inRange(item.date, range),
    )
    .forEach((item) => {
      const key = item.subcategory_id || "none";
      totals.set(key, (totals.get(key) || 0) + Number(item.amount));
    });

  return totals;
}

export default function SubcategoryComparison({
  transactions,
  subcategories,
  categoryId,
  range,
  compareRange,
  selectedId,
  onSelect,
}) {
  const data = useMemo(() => {
    const current = totalBySubcategory(transactions, range, categoryId);
    const comparison = totalBySubcategory(
      transactions,
      compareRange,
      categoryId,
    );
    const ids = new Set([...current.keys(), ...comparison.keys()]);

    return [...ids]
      .map((id) => {
        const subcategory = subcategories.find((item) => item.id === id);
        const currentValue = current.get(id) || 0;
        const comparisonValue = comparison.get(id) || 0;
        const variation = comparisonValue
          ? ((currentValue - comparisonValue) / comparisonValue) * 100
          : currentValue > 0
            ? null
            : 0;
        return {
          id: id === "none" ? null : id,
          key: id,
          name: subcategory?.name || "Senza sottocategoria",
          icon: subcategory?.icon || "•",
          current: currentValue,
          comparison: comparisonValue,
          variation,
        };
      })
      .sort((a, b) => b.current - a.current);
  }, [transactions, subcategories, categoryId, range, compareRange]);

  if (!data.length) return null;

  return (
    <section className="rounded-[1.75rem] border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80 sm:p-6">
      <h2 className="text-lg font-black text-slate-950 dark:text-white">
        Sottocategorie a confronto
      </h2>
      <p className="mt-1 text-sm text-slate-400">
        Scopri quale dettaglio ha fatto aumentare o diminuire la categoria.
      </p>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {data.map((item) => {
          const active = selectedId === item.id;
          const increased = (item.variation || 0) > 0;
          const decreased = (item.variation || 0) < 0;
          const Icon = increased
            ? ArrowUpRight
            : decreased
              ? ArrowDownRight
              : Minus;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelect(active ? null : item.id)}
              className={`rounded-2xl border p-4 text-left transition ${
                active
                  ? "border-emerald-400 bg-emerald-400/10"
                  : "border-slate-200 bg-slate-50/70 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/40 dark:hover:border-slate-600"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="font-black text-slate-950 dark:text-white">
                  {item.icon} {item.name}
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-xs font-black ${
                    increased
                      ? "text-rose-500"
                      : decreased
                        ? "text-emerald-500"
                        : "text-slate-400"
                  }`}
                >
                  <Icon size={13} />
                  {item.variation == null
                    ? "Nuova"
                    : `${Math.abs(item.variation).toFixed(0)}%`}
                </span>
              </div>
              <strong className="mt-3 block text-xl text-slate-950 dark:text-white">
                {euro.format(item.current)}
              </strong>
              <span className="mt-1 block text-xs text-slate-400">
                Confronto: {euro.format(item.comparison)}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
