import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const euro = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});

export default function SameMonthYears({
  transactions,
  anchorMonth,
  onSelectYear,
}) {
  const data = useMemo(() => {
    const targetMonth = Number(anchorMonth.slice(5, 7));
    const buckets = new Map();

    transactions.forEach((item) => {
      const [year, month] = item.date.split("-").map(Number);
      if (month !== targetMonth) return;

      const bucket = buckets.get(year) || {
        year,
        label: String(year),
        income: 0,
        expenses: 0,
        balance: 0,
        rows: [],
      };

      if (item.type === "income") bucket.income += Number(item.amount);
      if (item.type === "expense") bucket.expenses += Number(item.amount);
      bucket.rows.push(item);
      buckets.set(year, bucket);
    });

    return [...buckets.values()]
      .map((item) => ({ ...item, balance: item.income - item.expenses }))
      .sort((first, second) => first.year - second.year);
  }, [transactions, anchorMonth]);

  if (data.length < 2) return null;

  const monthLabel = new Date(`${anchorMonth}-01T12:00:00`).toLocaleDateString(
    "it-IT",
    { month: "long" },
  );

  return (
    <section className="rounded-[1.75rem] border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80 sm:p-6">
      <h2 className="text-lg font-black capitalize text-slate-950 dark:text-white">
        {monthLabel} negli anni
      </h2>
      <p className="mt-1 text-sm text-slate-400">
        Confronta entrate e spese dello stesso mese. Clicca un anno per vedere i
        movimenti.
      </p>

      <div className="mt-5 h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: -12, right: 12 }}>
            <CartesianGrid vertical={false} opacity={0.12} />
            <XAxis dataKey="label" fontSize={11} />
            <YAxis
              fontSize={11}
              tickFormatter={(value) => `${Math.round(value)} €`}
            />
            <Tooltip formatter={(value) => euro.format(value)} />
            <Legend />
            <Bar
              dataKey="income"
              name="Entrate"
              fill="#34d399"
              radius={[8, 8, 0, 0]}
              onClick={(entry) => onSelectYear(entry)}
              className="cursor-pointer"
            />
            <Bar
              dataKey="expenses"
              name="Spese"
              fill="#fb7185"
              radius={[8, 8, 0, 0]}
              onClick={(entry) => onSelectYear(entry)}
              className="cursor-pointer"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((item) => (
          <button
            key={item.year}
            type="button"
            onClick={() => onSelectYear(item)}
            className="rounded-2xl bg-slate-50 p-3 text-left transition hover:bg-slate-100 dark:bg-slate-800/45 dark:hover:bg-slate-800"
          >
            <strong className="text-slate-950 dark:text-white">
              {item.year}
            </strong>
            <span className="mt-1 block text-xs text-slate-400">
              Saldo {euro.format(item.balance)} · {item.rows.length} movimenti
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
