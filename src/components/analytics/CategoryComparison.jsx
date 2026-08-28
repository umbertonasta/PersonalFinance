import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { inRange } from "@/lib/dateRanges";

const euro = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});

function totalsByCategory(transactions, range) {
  const totals = new Map();
  if (!range) return totals;

  transactions
    .filter(
      (item) =>
        item.type === "expense" &&
        item.category_id &&
        item.review_status === "verified" &&
        inRange(item.date, range),
    )
    .forEach((item) => {
      totals.set(
        item.category_id,
        (totals.get(item.category_id) || 0) + Number(item.amount),
      );
    });

  return totals;
}

export default function CategoryComparison({
  transactions,
  taxonomy,
  range,
  compareRange,
  onOpenCategory,
}) {
  const data = useMemo(() => {
    const current = totalsByCategory(transactions, range);
    const comparison = totalsByCategory(transactions, compareRange);

    return taxonomy.categories
      .map((category) => ({
        id: category.id,
        name: category.name,
        icon: category.icon,
        color: category.color,
        current: current.get(category.id) || 0,
        comparison: comparison.get(category.id) || 0,
      }))
      .filter((item) => item.current > 0 || item.comparison > 0)
      .sort(
        (first, second) =>
          Math.max(second.current, second.comparison) -
          Math.max(first.current, first.comparison),
      )
      .slice(0, 8);
  }, [transactions, taxonomy.categories, range, compareRange]);

  if (!compareRange || data.length === 0) return null;

  return (
    <section className="rounded-[1.75rem] border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80 sm:p-6">
      <h2 className="text-lg font-black text-slate-950 dark:text-white">
        Categorie a confronto
      </h2>
      <p className="mt-1 text-sm text-slate-400">
        Periodo scelto rispetto a {compareRange.label}. Clicca una barra per
        approfondire.
      </p>

      <div className="mt-5 h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: -12, right: 12 }}>
            <CartesianGrid vertical={false} opacity={0.12} />
            <XAxis dataKey="name" fontSize={11} tickLine={false} />
            <YAxis
              fontSize={11}
              tickLine={false}
              tickFormatter={(value) => `${Math.round(value)} €`}
            />
            <Tooltip formatter={(value) => euro.format(value)} />
            <Legend />
            <Bar
              dataKey="current"
              name="Periodo scelto"
              fill="#34d399"
              radius={[8, 8, 0, 0]}
              className="cursor-pointer"
              onClick={(entry) => onOpenCategory(entry.id)}
            />
            <Bar
              dataKey="comparison"
              name="Confronto"
              fill="#64748b"
              radius={[8, 8, 0, 0]}
              className="cursor-pointer"
              onClick={(entry) => onOpenCategory(entry.id)}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
