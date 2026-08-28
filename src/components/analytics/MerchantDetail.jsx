import { useMemo } from "react";
import { X } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
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

export default function MerchantDetail({
  merchant,
  transactions,
  range,
  onClose,
  onEditTransaction,
}) {
  const rows = useMemo(() => {
    if (!merchant) return [];
    return transactions.filter(
      (item) =>
        item.type === "expense" &&
        inRange(item.date, range) &&
        (item.normalized_merchant || item.description || "Sconosciuto") ===
          merchant,
    );
  }, [merchant, transactions, range]);

  const trend = useMemo(() => {
    const buckets = new Map();
    rows.forEach((item) => {
      const key = item.date.slice(0, 7);
      const bucket = buckets.get(key) || {
        key,
        label: new Date(`${key}-01T12:00:00`).toLocaleDateString("it-IT", {
          month: "short",
          year: "2-digit",
        }),
        value: 0,
      };
      bucket.value += Number(item.amount);
      buckets.set(key, bucket);
    });
    return [...buckets.values()].sort((a, b) => a.key.localeCompare(b.key));
  }, [rows]);

  if (!merchant) return null;
  const total = rows.reduce((sum, item) => sum + Number(item.amount), 0);
  const categoryTotals = new Map();
  rows.forEach((item) => {
    const name = item.category || "Da classificare";
    categoryTotals.set(
      name,
      (categoryTotals.get(name) || 0) + Number(item.amount),
    );
  });
  const topCategory = [...categoryTotals.entries()].sort(
    (a, b) => b[1] - a[1],
  )[0];

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/65 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={onClose}
    >
      <section
        className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-t-[2rem] border border-slate-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-slate-900 sm:rounded-[2rem] sm:p-6"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[.16em] text-blue-600 dark:text-emerald-400">
              Analisi esercente
            </p>
            <h2 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
              {merchant}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800"
            aria-label="Chiudi"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Metric label="Totale" value={euro.format(total)} />
          <Metric label="Pagamenti" value={rows.length} />
          <Metric
            label="Media"
            value={euro.format(rows.length ? total / rows.length : 0)}
          />
        </div>

        {topCategory && (
          <p className="mt-4 text-sm text-slate-400">
            Categoria principale: <strong>{topCategory[0]}</strong>
          </p>
        )}

        <div className="mt-5 h-56 rounded-2xl bg-slate-50/60 p-3 dark:bg-slate-800/35">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ left: -18, right: 8 }}>
              <CartesianGrid vertical={false} opacity={0.12} />
              <XAxis dataKey="label" fontSize={11} />
              <YAxis
                fontSize={11}
                tickFormatter={(value) => `${Math.round(value)} €`}
              />
              <Tooltip formatter={(value) => euro.format(value)} />
              <Area
                type="monotone"
                dataKey="value"
                name="Spese"
                stroke="#34d399"
                fill="#34d399"
                fillOpacity={0.16}
                strokeWidth={3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-5 space-y-2">
          {rows
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onEditTransaction(item)}
                className="flex w-full items-center gap-3 rounded-2xl bg-slate-50 p-3 text-left dark:bg-slate-800/50"
              >
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-slate-950 dark:text-white">
                    {item.description}
                  </strong>
                  <span className="text-xs text-slate-400">
                    {new Date(`${item.date}T12:00:00`).toLocaleDateString(
                      "it-IT",
                    )}{" "}
                    · {item.category || "Da classificare"}
                  </span>
                </span>
                <strong className="text-rose-600">
                  −{euro.format(item.amount)}
                </strong>
              </button>
            ))}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/50">
      <span className="text-xs text-slate-400">{label}</span>
      <strong className="mt-1 block text-xl text-slate-950 dark:text-white">
        {value}
      </strong>
    </div>
  );
}
