import { CalendarDays, GitCompareArrows } from "lucide-react";
import { COMPARISON_OPTIONS, PERIOD_PRESETS } from "@/lib/dateRanges";

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
  return (
    <section className="rounded-[1.6rem] border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-blue-600 dark:text-emerald-400">
            <CalendarDays size={15} /> Periodo analizzato
          </div>
          <h2 className="mt-2 text-xl font-black capitalize text-slate-950 dark:text-white">
            {range.label}
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Tutti i numeri e i grafici seguono questo intervallo.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[620px]">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-slate-500 dark:text-slate-400">
              Intervallo
            </span>
            <select
              value={preset}
              onChange={(event) => onPresetChange(event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              {PERIOD_PRESETS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
              <GitCompareArrows size={14} /> Confronto
            </span>
            <select
              value={comparison}
              onChange={(event) => onComparisonChange(event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              {COMPARISON_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {preset === "custom" && (
        <div className="mt-4 grid gap-3 rounded-2xl bg-slate-50/70 p-4 dark:bg-slate-800/45 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-slate-500">
              Dal giorno
            </span>
            <input
              type="date"
              value={customRange.start}
              max={customRange.end || undefined}
              onChange={(event) =>
                onCustomRangeChange({
                  ...customRange,
                  start: event.target.value,
                })
              }
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-slate-500">
              Al giorno
            </span>
            <input
              type="date"
              value={customRange.end}
              min={customRange.start || undefined}
              onChange={(event) =>
                onCustomRangeChange({ ...customRange, end: event.target.value })
              }
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </label>
        </div>
      )}

      {comparison === "preset:custom" && (
        <div className="mt-4 grid gap-3 rounded-2xl border border-violet-200 bg-violet-50/70 p-4 dark:border-violet-500/20 dark:bg-violet-500/10 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-slate-500 dark:text-slate-400">
              Confronta dal giorno
            </span>
            <input
              type="date"
              value={customComparisonRange.start}
              max={customComparisonRange.end || undefined}
              onChange={(event) =>
                onCustomComparisonRangeChange({
                  ...customComparisonRange,
                  start: event.target.value,
                })
              }
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-slate-500 dark:text-slate-400">
              Confronta al giorno
            </span>
            <input
              type="date"
              value={customComparisonRange.end}
              min={customComparisonRange.start || undefined}
              onChange={(event) =>
                onCustomComparisonRangeChange({
                  ...customComparisonRange,
                  end: event.target.value,
                })
              }
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </label>
        </div>
      )}

      {comparisonRange && (
        <p className="mt-3 text-xs font-semibold text-slate-400">
          Intervallo di confronto:{" "}
          <span className="capitalize">{comparisonRange.label}</span>
        </p>
      )}
    </section>
  );
}
