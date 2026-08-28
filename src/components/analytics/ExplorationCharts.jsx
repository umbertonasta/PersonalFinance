import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  buildAmountBands,
  buildCumulative,
  buildWeekdayAnalysis,
  expenseRows,
} from "@/lib/analytics";
import { inRange } from "@/lib/dateRanges";
import TransactionDrilldown from "@/components/analytics/TransactionDrilldown";
const euro = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});
const tabs = [
  { id: "weekdays", label: "Giorni" },
  { id: "amounts", label: "Importi" },
  { id: "cumulative", label: "Cumulativo" },
];
export default function ExplorationCharts({
  transactions,
  range,
  compareRange,
  onEditTransaction,
}) {
  const [tab, setTab] = useState("weekdays");
  const [detail, setDetail] = useState(null);
  const rows = useMemo(
    () => expenseRows(transactions, range),
    [transactions, range],
  );
  const compareRows = useMemo(
    () =>
      compareRange
        ? transactions.filter(
            (x) => x.type === "expense" && inRange(x.date, compareRange),
          )
        : [],
    [transactions, compareRange],
  );
  const weekdays = useMemo(() => buildWeekdayAnalysis(rows), [rows]);
  const bands = useMemo(() => buildAmountBands(rows), [rows]);
  const cumulative = useMemo(
    () => buildCumulative(rows, range, compareRows),
    [rows, range, compareRows],
  );
  return (
    <section className="rounded-[1.75rem] border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <div>
          <h2 className="text-lg font-black dark:text-white">
            Esplora i tuoi dati
          </h2>
          <p className="text-sm text-slate-400">
            Clicca un elemento per vedere i movimenti.
          </p>
        </div>
        <div className="flex gap-1 overflow-auto rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          {tabs.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`rounded-lg px-3 py-2 text-xs font-black ${tab === item.id ? "bg-white shadow dark:bg-slate-950 dark:text-white" : "text-slate-500"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      {tab === "weekdays" && (
        <Bars
          data={weekdays}
          dataKey="total"
          labelKey="shortName"
          color="#3b82f6"
          onSelect={(item) => setDetail({ title: item.name, rows: item.rows })}
        />
      )}{" "}
      {tab === "amounts" && (
        <Bars
          data={bands}
          dataKey="count"
          labelKey="name"
          color="#8b5cf6"
          onSelect={(item) => setDetail({ title: item.name, rows: item.rows })}
        />
      )}{" "}
      {tab === "cumulative" && <Cumulative data={cumulative} />}
      <TransactionDrilldown
        detail={detail}
        onClose={() => setDetail(null)}
        onEdit={onEditTransaction}
      />
    </section>
  );
}
function Bars({ data, dataKey, labelKey, color, onSelect }) {
  return (
    <div className="mt-6 h-80">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid vertical={false} opacity={0.12} />
          <XAxis dataKey={labelKey} fontSize={11} />
          <YAxis fontSize={11} />
          <Tooltip />
          <Bar
            dataKey={dataKey}
            onClick={onSelect}
            className="cursor-pointer"
            radius={[10, 10, 0, 0]}
          >
            {data.map((x) => (
              <Cell key={x.key} fill={color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
function Cumulative({ data }) {
  const a = data.filter((x) => x.series === "Periodo scelto"),
    b = data.filter((x) => x.series === "Confronto");
  return (
    <div className="mt-6 h-80">
      <ResponsiveContainer>
        <LineChart>
          <CartesianGrid vertical={false} opacity={0.12} />
          <XAxis
            dataKey="label"
            allowDuplicatedCategory={false}
            fontSize={11}
          />
          <YAxis fontSize={11} />
          <Tooltip formatter={(v) => euro.format(v)} />
          <Line
            data={a}
            dataKey="value"
            name="Periodo scelto"
            stroke="#34d399"
            strokeWidth={3}
            dot={false}
          />
          {b.length > 0 && (
            <Line
              data={b}
              dataKey="value"
              name="Confronto"
              stroke="#94a3b8"
              strokeDasharray="6 6"
              dot={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
