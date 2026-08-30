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
  subcategory,
  taxonomy,
  transactions,
  range,
  onClose,
  onEditTransaction,
}) {
  const rows = useMemo(() => {
    if (!subcategory) return [];
    return transactions.filter(
      (item) =>
        item.type === "expense" &&
        inRange(item.date, range) &&
        (subcategory.id
          ? item.subcategory_id === subcategory.id
          : !item.subcategory_id),
    );
  }, [subcategory, transactions, range]);
  const microMap = new Map(
    (taxonomy?.microcategories || []).map((item) => [item.id, item]),
  );
  const microcategories = useMemo(() => {
    const groups = new Map();
    rows.forEach((item) => {
      const micro = microMap.get(item.microcategory_id);
      const key = micro?.id || "none";
      const group = groups.get(key) || {
        name: micro?.name || "Senza microcategoria",
        value: 0,
        rows: [],
      };
      group.value += Number(item.amount);
      group.rows.push(item);
      groups.set(key, group);
    });
    return [...groups.values()].sort((a, b) => b.value - a.value);
  }, [rows, taxonomy]);
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
  if (!subcategory) return null;
  const total = rows.reduce((sum, item) => sum + Number(item.amount), 0);
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={onClose}
    >
      <section
        className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-t-[2rem] bg-white p-6 dark:bg-slate-900 sm:rounded-[2rem]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[.16em] text-blue-600 dark:text-emerald-400">
              Analisi sottocategoria
            </p>
            <h2 className="mt-2 text-3xl font-black">{subcategory.name}</h2>
            <p className="mt-1 text-sm text-slate-400">
              {subcategory.categoryName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 dark:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <Metric label="Totale" value={euro.format(total)} />
          <Metric label="Movimenti" value={rows.length} />
          <Metric
            label="Media"
            value={euro.format(rows.length ? total / rows.length : 0)}
          />
        </div>
        <div className="mt-5 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend}>
              <CartesianGrid vertical={false} opacity={0.12} />
              <XAxis dataKey="label" />
              <YAxis tickFormatter={(value) => `${Math.round(value)} €`} />
              <Tooltip formatter={(value) => euro.format(value)} />
              <Area
                dataKey="value"
                name={subcategory.name}
                stroke="#34d399"
                fill="#34d399"
                fillOpacity={0.14}
                strokeWidth={3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <h3 className="mt-6 font-black">Microcategorie</h3>
        <div className="mt-2 space-y-2">
          {microcategories.map((item) => (
            <div
              key={item.name}
              className="flex justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50"
            >
              <span>{item.name}</span>
              <b>{euro.format(item.value)}</b>
            </div>
          ))}
        </div>
        <h3 className="mt-6 font-black">Movimenti</h3>
        <div className="mt-2 space-y-2">
          {[...rows]
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((item) => (
              <button
                key={item.id}
                onClick={() => onEditTransaction(item)}
                className="flex w-full items-center gap-3 rounded-2xl bg-slate-50 p-3 text-left dark:bg-slate-800/50"
              >
                <span className="min-w-0 flex-1">
                  <b className="block truncate">{item.description}</b>
                  <small className="text-slate-400">
                    {microMap.get(item.microcategory_id)?.name ||
                      "Senza microcategoria"}{" "}
                    ·{" "}
                    {new Date(`${item.date}T12:00:00`).toLocaleDateString(
                      "it-IT",
                    )}
                  </small>
                </span>
                <b className="text-rose-600">-{euro.format(item.amount)}</b>
              </button>
            ))}
        </div>
      </section>
    </div>
  );
}
function Metric({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
      <small className="text-slate-400">{label}</small>
      <b className="mt-1 block text-lg">{value}</b>
    </div>
  );
}
