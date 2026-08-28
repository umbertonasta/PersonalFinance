import { AlertTriangle, Check, History, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const euro = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});

export default function SimilarClassificationCheck({
  matches,
  taxonomy,
  candidate,
  onUsePrevious,
  onContinue,
  onCancel,
}) {
  if (!matches?.length) return null;

  const categoryMap = new Map(
    taxonomy.categories.map((item) => [item.id, item]),
  );
  const subcategoryMap = new Map(
    taxonomy.subcategories.map((item) => [item.id, item]),
  );
  const microcategoryMap = new Map(
    taxonomy.microcategories.map((item) => [item.id, item]),
  );
  const best = matches[0].transaction;

  function path(item) {
    return [
      categoryMap.get(item.category_id)?.name || item.category,
      subcategoryMap.get(item.subcategory_id)?.name,
      microcategoryMap.get(item.microcategory_id)?.name,
    ]
      .filter(Boolean)
      .join(" → ");
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/70 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={onCancel}
    >
      <section
        className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-t-[2rem] border border-amber-200 bg-white p-5 shadow-2xl dark:border-amber-500/20 dark:bg-slate-900 sm:rounded-[2rem] sm:p-6"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
              <AlertTriangle size={21} />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[.16em] text-amber-600">
                Controllo coerenza
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">
                Esistono movimenti simili classificati diversamente
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Non è necessariamente un errore. Controlla prima di salvare.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800"
            aria-label="Chiudi"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/20 dark:bg-blue-500/10">
          <span className="text-xs font-bold text-blue-600 dark:text-blue-300">
            Classificazione scelta
          </span>
          <strong className="mt-1 block text-blue-950 dark:text-blue-100">
            {path({
              category_id: candidate.categoryId,
              subcategory_id: candidate.subcategoryId,
              microcategory_id: candidate.microcategoryId,
              category: candidate.category,
            })}
          </strong>
        </div>

        <div className="mt-4 space-y-2">
          {matches.slice(0, 3).map(({ transaction, score, reason }) => (
            <div
              key={transaction.id}
              className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/50"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <strong className="block truncate text-slate-950 dark:text-white">
                    {transaction.description}
                  </strong>
                  <span className="text-xs text-slate-400">
                    {reason} · somiglianza {Math.round(score * 100)}%
                  </span>
                </span>
                <strong className="shrink-0 text-sm text-slate-950 dark:text-white">
                  {euro.format(transaction.amount)}
                </strong>
              </div>
              <p className="mt-2 text-sm font-bold text-slate-600 dark:text-slate-300">
                {path(transaction)}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-2 sm:grid-cols-3">
          <Button
            variant="outline"
            onClick={onCancel}
            className="h-11 rounded-xl"
          >
            Torna all'editor
          </Button>
          <Button
            variant="outline"
            onClick={() => onUsePrevious(best)}
            className="h-11 rounded-xl"
          >
            <History size={16} /> Usa la precedente
          </Button>
          <Button onClick={onContinue} className="h-11 rounded-xl">
            <Check size={16} /> Continua comunque
          </Button>
        </div>
      </section>
    </div>
  );
}
