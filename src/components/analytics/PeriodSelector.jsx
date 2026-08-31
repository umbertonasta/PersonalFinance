import { CalendarDays, GitCompareArrows } from "lucide-react";
import {
  COMPARISON_OPTIONS,
  PERIOD_PRESETS,
  todayIso,
} from "@/lib/dateRanges";

const selectClass =
  "h-11 min-w-0 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white";

export default function PeriodSelector({
  preset,
  onPresetChange,
  comparison,
  onComparisonChange,
  range,
  customRange,
  onCustomRangeChange,
  comparisonRange,
  customComparisonRange,
  onCustomComparisonRangeChange,
}) {
  const today = todayIso();
  return (
    <section className="min-w-0 max-w-full overflow-hidden rounded-[1.5rem] border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80 sm:rounded-[2rem] sm:p-6">
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-400/10 text-emerald-500">
          <CalendarDays size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase tracking-[.15em] text-emerald-500">Periodo analizzato</p>
          <h2 className="mt-1 truncate text-xl font-black text-slate-950 dark:text-white sm:text-2xl">{range.label}</h2>
          <p className="mt-1 hidden text-sm text-slate-400 sm:block">Tutti i numeri e i grafici seguono questo intervallo.</p>
        </div>
      </div>

      <div className="mt-4 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="min-w-0">
          <span className="mb-1.5 block text-xs font-bold text-slate-400">Intervallo</span>
          <select value={preset} onChange={(event) => onPresetChange(event.target.value)} className={selectClass}>
            {PERIOD_PRESETS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="min-w-0">
          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-400"><GitCompareArrows size={14} />Confronto</span>
          <select value={comparison} onChange={(event) => onComparisonChange(event.target.value)} className={selectClass}>
            {COMPARISON_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      </div>

      {preset === "custom" && (
        <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
          <DateField label="Dal giorno" value={customRange.start} max={customRange.end < today ? customRange.end : today} onChange={(value) => onCustomRangeChange({ ...customRange, start: value })} />
          <DateField label="Al giorno" value={customRange.end} max={today} onChange={(value) => onCustomRangeChange({ ...customRange, end: value })} />
        </div>
      )}
      {comparison === "preset:custom" && (
        <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
          <DateField label="Confronta dal giorno" value={customComparisonRange.start} max={customComparisonRange.end < today ? customComparisonRange.end : today} onChange={(value) => onCustomComparisonRangeChange({ ...customComparisonRange, start: value })} />
          <DateField label="Confronta al giorno" value={customComparisonRange.end} max={today} onChange={(value) => onCustomComparisonRangeChange({ ...customComparisonRange, end: value })} />
        </div>
      )}
      {comparisonRange && <p className="mt-3 break-words text-xs font-semibold text-slate-400">Confronto: <span className="capitalize">{comparisonRange.label}</span></p>}
    </section>
  );
}

function DateField({ label, value, max, onChange }) {
  return <label className="min-w-0"><span className="mb-1.5 block text-xs font-bold text-slate-400">{label}</span><input type="date" value={value} max={max} onChange={(event) => onChange(event.target.value)} className={selectClass} /></label>;
}
