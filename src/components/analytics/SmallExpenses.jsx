import { useMemo } from "react";
import { Coins, ChevronRight } from "lucide-react";
import { inRange } from "@/lib/dateRanges";
const euro = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
export default function SmallExpenses({ transactions, range, compareRange, threshold = 10, onOpen }) {
  const model = useMemo(() => {
    const get = (selectedRange) => selectedRange ? transactions.filter((item) => item.type === "expense" && Number(item.amount) < threshold && inRange(item.date, selectedRange)) : [];
    const rows = get(range), comparison = get(compareRange);
    const total = rows.reduce((sum, item) => sum + Number(item.amount), 0);
    const comparisonTotal = comparison.reduce((sum, item) => sum + Number(item.amount), 0);
    const allExpenses = transactions.filter((item) => item.type === "expense" && inRange(item.date, range)).reduce((sum, item) => sum + Number(item.amount), 0);
    const merchants = Object.entries(rows.reduce((acc, item) => { const name = item.normalized_merchant || item.description; acc[name] = (acc[name] || 0) + 1; return acc; }, {})).sort((a,b) => b[1]-a[1]).slice(0,3);
    return { rows, total, count: rows.length, average: rows.length ? total / rows.length : 0, share: allExpenses ? total / allExpenses * 100 : 0, change: comparisonTotal ? (total-comparisonTotal)/comparisonTotal*100 : null, merchants };
  }, [transactions, range, compareRange, threshold]);
  return <button type="button" onClick={() => onOpen({ title: `Spese sotto ${threshold} €`, rows: model.rows })} className="w-full rounded-[1.75rem] border border-white/70 bg-white/80 p-5 text-left shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-slate-900/80 sm:p-6"><div className="flex items-start justify-between"><span className="grid h-11 w-11 place-items-center rounded-xl bg-amber-400/12 text-amber-500"><Coins size={21}/></span><ChevronRight className="text-slate-400"/></div><h2 className="mt-4 text-lg font-black dark:text-white">Piccole spese frequenti</h2><p className="text-sm text-slate-400">Operazioni inferiori a {threshold} €</p><strong className="mt-4 block text-3xl dark:text-white">{euro.format(model.total)}</strong><p className="mt-1 text-sm text-slate-400">{model.count} movimenti · media {euro.format(model.average)} · {model.share.toFixed(0)}% delle spese</p>{model.change != null && <p className={`mt-2 text-xs font-black ${model.change > 0 ? "text-rose-500" : "text-emerald-500"}`}>{model.change > 0 ? "+" : ""}{model.change.toFixed(0)}% rispetto al confronto</p>}<div className="mt-4 flex flex-wrap gap-2">{model.merchants.map(([name,count]) => <span key={name} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500 dark:bg-slate-800">{name} · {count}</span>)}</div></button>;
}
