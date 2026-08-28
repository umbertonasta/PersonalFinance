import { useMemo } from "react";
import { AlertCircle } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { buildChangeDrivers } from "@/lib/analytics";

const euro = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});

export default function SpendingChangeDrivers({
  transactions,
  taxonomy,
  range,
  compareRange,
  onOpen,
}) {
  const data = useMemo(
    () =>
      buildChangeDrivers(
        transactions,
        range,
        compareRange,
        taxonomy.categories,
      ),
    [transactions, range, compareRange, taxonomy.categories],
  );

  if (!compareRange) {
    return (
      <EmptyState text="Attiva un confronto per capire quali categorie hanno fatto aumentare o diminuire le spese." />
    );
  }

  if (!data.length) {
    return (
      <EmptyState text="Non ci sono spese confrontabili nei due periodi selezionati. Prova un altro intervallo oppure classifica i movimenti ancora nel limbo." />
    );
  }

  const leader = data[0];

  return (
    <section className="tech-panel p-5 sm:p-6">
      <p className="section-kicker">Cosa è cambiato</p>
      <h2 className="section-title">Perché le spese sono cambiate?</h2>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
        <span className="rounded-full bg-rose-400/10 px-3 py-1.5 text-rose-500">
          A destra, rosso: spese in più
        </span>
        <span className="rounded-full bg-emerald-400/10 px-3 py-1.5 text-emerald-500">
          A sinistra, verde: spese in meno
        </span>
      </div>
      <p className="section-copy">
        La differenza è calcolata tra il periodo selezionato e il confronto.
        Premi una barra per vedere i movimenti.
      </p>
      <div className="mt-5 h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data.slice(0, 8)}
            layout="vertical"
            margin={{ left: 18, right: 25 }}
          >
            <CartesianGrid horizontal={false} opacity={0.1} />
            <XAxis
              type="number"
              tickFormatter={(value) => `${Math.round(value)} €`}
              fontSize={11}
            />
            <YAxis type="category" dataKey="name" width={105} fontSize={11} />
            <Tooltip formatter={(value) => euro.format(value)} />
            <Bar
              dataKey="difference"
              name="Differenza delle spese"
              radius={[8, 8, 8, 8]}
              onClick={(item) => onOpen({ title: item.name, rows: item.rows })}
              className="cursor-pointer"
            >
              {data.slice(0, 8).map((item) => (
                <Cell
                  key={item.key}
                  fill={item.difference >= 0 ? "#fb7185" : "#34d399"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <button
        type="button"
        onClick={() => onOpen({ title: leader.name, rows: leader.rows })}
        className="insight-ribbon"
      >
        {leader.difference >= 0 ? "Spese in più" : "Spese in meno"}:{" "}
        <b>{leader.name}</b> ha inciso per{" "}
        {euro.format(Math.abs(leader.difference))}. <b>Esplora</b>
      </button>
    </section>
  );
}

function EmptyState({ text }) {
  return (
    <section className="tech-panel p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sky-400/10 text-sky-400">
          <AlertCircle size={20} />
        </span>
        <div>
          <h2 className="section-title">Categorie e cambiamenti</h2>
          <p className="section-copy">{text}</p>
        </div>
      </div>
    </section>
  );
}
